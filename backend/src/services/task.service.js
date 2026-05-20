const prisma = require("../prisma/client");
const ApiError = require("../utils/apiError");
const { ensureProjectAccess } = require("./project.service");
const {
  notifyTaskAssigned,
  notifyTaskDueSoon,
  notifyTaskStatusChanged,
} = require("./notification.service");

const taskInclude = {
  project: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  assignedTo: { select: { id: true, name: true, email: true, role: true } },
};

const taskDetailInclude = {
  ...taskInclude,
  comments: {
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: "asc" },
  },
  activities: {
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
  },
};

const activityLabel = {
  created: "Task created",
  status_changed: "Status changed",
  priority_changed: "Priority changed",
  assignee_changed: "Assignee updated",
  assignment_changed: "Assignment type updated",
  due_date_updated: "Due date updated",
  description_updated: "Description updated",
  comment_added: "Comment added",
};

const createActivity = async (taskId, userId, action, oldValue = null, newValue = null) => {
  return prisma.taskActivity.create({
    data: {
      taskId,
      userId,
      action,
      oldValue,
      newValue,
    },
  });
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "None";
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const ensureTaskAccess = async (taskId, user) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: { select: { userId: true } } } } },
  });

  if (!task) throw new ApiError(404, "Task not found");

  const canAccess =
    user.role === "ADMIN" ||
    task.createdById === user.id ||
    task.assignedToId === user.id ||
    task.assignmentType === "TEAM" ||
    task.project.members.some((member) => member.userId === user.id);

  if (!canAccess) throw new ApiError(404, "Task not found");
  return task;
};

const ensureAssignableUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new ApiError(400, "Assigned user must be a registered team member");
  }
};

const memberVisibleTaskWhere = (user) => ({
  OR: [
    { assignmentType: "TEAM" },
    { assignedToId: user.id },
  ],
});

const accessibleTaskWhere = (user) =>
  user.role === "ADMIN"
    ? {}
    : memberVisibleTaskWhere(user);

const dayRange = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const applyDueDateFilter = (where, filters) => {
  const now = new Date();

  if (filters.due === "overdue") {
    where.dueDate = { lt: now };
    if (!where.status) where.status = { not: "DONE" };
    return;
  }

  if (filters.due === "today") {
    const { start, end } = dayRange(now);
    where.dueDate = { gte: start, lt: end };
    return;
  }

  if (filters.due === "week") {
    const { start } = dayRange(now);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    where.dueDate = { gte: start, lt: end };
    return;
  }

  if (filters.due === "no_due") {
    where.dueDate = null;
    return;
  }

  const dueDate = filters.dueDate || filters.dueOn;
  if (dueDate && !Number.isNaN(Date.parse(dueDate))) {
    const { start, end } = dayRange(new Date(dueDate));
    where.dueDate = { gte: start, lt: end };
    return;
  }

  if (filters.dueFrom || filters.dueTo) {
    where.dueDate = {};
    if (filters.dueFrom && !Number.isNaN(Date.parse(filters.dueFrom))) {
      where.dueDate.gte = new Date(filters.dueFrom);
    }
    if (filters.dueTo && !Number.isNaN(Date.parse(filters.dueTo))) {
      where.dueDate.lte = new Date(filters.dueTo);
    }
  }
};

const normalizeAssignment = async (projectId, payload) => {
  const requestedType =
    payload.assignmentType || (payload.assignedToId ? "USER" : "UNASSIGNED");

  if (!["UNASSIGNED", "USER", "TEAM"].includes(requestedType)) {
    throw new ApiError(422, "Validation failed", {
      assignmentType: ["assignmentType must be one of: UNASSIGNED, USER, TEAM"],
    });
  }

  if (requestedType === "USER") {
    if (!payload.assignedToId) {
      throw new ApiError(422, "Validation failed", {
        assignedToId: ["assignedToId is required for USER assignments"],
      });
    }

    await ensureAssignableUser(payload.assignedToId);
    return { assignmentType: "USER", assignedToId: payload.assignedToId };
  }

  return { assignmentType: requestedType, assignedToId: null };
};

const getTasks = async (filters, user) => {
  const where = {
    ...accessibleTaskWhere(user),
  };

  if (["TODO", "IN_PROGRESS", "DONE"].includes(filters.status)) where.status = filters.status;
  if (["LOW", "MEDIUM", "HIGH"].includes(filters.priority)) where.priority = filters.priority;
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.assignedToId) {
    where.assignedToId = filters.assignedToId;
    where.assignmentType = "USER";
  }
  if (["UNASSIGNED", "USER", "TEAM"].includes(filters.assignmentType)) where.assignmentType = filters.assignmentType;
  applyDueDateFilter(where, filters);
  if (filters.mine === "true") {
    where.AND = [...(where.AND || []), { OR: [{ assignmentType: "TEAM" }, { assignedToId: user.id }] }];
  }
  if (filters.search) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { title: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
          { project: { name: { contains: filters.search, mode: "insensitive" } } },
          { assignedTo: { name: { contains: filters.search, mode: "insensitive" } } },
        ],
      },
    ];
  }

  return prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });
};

const getTaskById = async (taskId, user) => {
  await ensureTaskAccess(taskId, user);

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: taskDetailInclude,
  });

  if (!task) throw new ApiError(404, "Task not found");
  return task;
};

const createTask = async (payload, user) => {
  await ensureProjectAccess(payload.projectId, user);
  const assignment = await normalizeAssignment(payload.projectId, payload);

  const task = await prisma.task.create({
    data: {
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      status: payload.status || "TODO",
      priority: payload.priority || "MEDIUM",
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      projectId: payload.projectId,
      assignmentType: assignment.assignmentType,
      assignedToId: assignment.assignedToId,
      createdById: user.id,
    },
    include: taskInclude,
  });

  if (task.assignmentType !== "UNASSIGNED") {
    await notifyTaskAssigned(task, user);
    await notifyTaskDueSoon(task);
  }
  await createActivity(task.id, user.id, "created", null, task.title);

  return task;
};

const updateTask = async (taskId, payload, user) => {
  const task = await ensureTaskAccess(taskId, user);

  const data = {};
  if (payload.title !== undefined) data.title = payload.title.trim();
  if (payload.description !== undefined) data.description = payload.description?.trim() || null;
  if (payload.status !== undefined) data.status = payload.status;
  if (payload.priority !== undefined) data.priority = payload.priority;
  if (payload.dueDate !== undefined) data.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
  if (payload.assignedToId !== undefined || payload.assignmentType !== undefined) {
    const assignment = await normalizeAssignment(task.projectId, {
      assignmentType: payload.assignmentType,
      assignedToId: payload.assignedToId,
    });
    data.assignmentType = assignment.assignmentType;
    data.assignedToId = assignment.assignedToId;
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data,
    include: taskInclude,
  });

  const activities = [];
  if (data.status !== undefined && data.status !== task.status) {
    activities.push(["status_changed", task.status, data.status]);
  }
  if (data.priority !== undefined && data.priority !== task.priority) {
    activities.push(["priority_changed", task.priority, data.priority]);
  }
  if (data.description !== undefined && data.description !== task.description) {
    activities.push(["description_updated", task.description, data.description]);
  }
  if (data.dueDate !== undefined && formatValue(data.dueDate) !== formatValue(task.dueDate)) {
    activities.push(["due_date_updated", task.dueDate, data.dueDate]);
  }
  if (data.assignmentType !== undefined && data.assignmentType !== task.assignmentType) {
    activities.push(["assignment_changed", task.assignmentType, data.assignmentType]);
  }
  if (data.assignedToId !== undefined && data.assignedToId !== task.assignedToId) {
    activities.push(["assignee_changed", task.assignedToId, data.assignedToId]);
  }

  await Promise.all(
    activities.map(([action, oldValue, newValue]) =>
      createActivity(taskId, user.id, action, formatValue(oldValue), formatValue(newValue)),
    ),
  );

  if (data.assignedToId !== undefined || data.assignmentType !== undefined) {
    await notifyTaskAssigned(updatedTask, user);
  }
  if (data.status !== undefined) {
    await notifyTaskStatusChanged(updatedTask, task.status, user);
  }
  if (data.dueDate !== undefined || data.assignedToId !== undefined || data.assignmentType !== undefined) {
    await notifyTaskDueSoon(updatedTask);
  }

  return updatedTask;
};

const deleteTask = async (taskId, user) => {
  await ensureTaskAccess(taskId, user);
  await prisma.task.delete({ where: { id: taskId } });
  return { id: taskId };
};

const assignTask = async (taskId, payload, user) => {
  const task = await ensureTaskAccess(taskId, user);
  const assignment = await normalizeAssignment(task.projectId, payload);

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: assignment,
    include: taskInclude,
  });

  await createActivity(taskId, user.id, "assignee_changed", task.assignedToId, updatedTask.assignedToId);
  if (task.assignmentType !== updatedTask.assignmentType) {
    await createActivity(taskId, user.id, "assignment_changed", task.assignmentType, updatedTask.assignmentType);
  }
  await notifyTaskAssigned(updatedTask, user);
  await notifyTaskDueSoon(updatedTask);

  return updatedTask;
};

const changeTaskStatus = async (taskId, status, user) => {
  const task = await ensureTaskAccess(taskId, user);

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { status },
    include: taskInclude,
  });

  await createActivity(taskId, user.id, "status_changed", task.status, status);
  await notifyTaskStatusChanged(updatedTask, task.status, user);

  return updatedTask;
};

const addComment = async (taskId, content, user) => {
  await ensureTaskAccess(taskId, user);
  const safeContent = typeof content === "string" ? content.trim() : "";
  if (!safeContent) {
    throw new ApiError(422, "Validation failed", { content: ["Comment is required"] });
  }

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      userId: user.id,
      content: safeContent,
    },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  await createActivity(taskId, user.id, "comment_added", null, safeContent.slice(0, 120));
  return comment;
};

const getOverdueTasks = async (user) => {
  return prisma.task.findMany({
    where: {
      dueDate: { lt: new Date() },
      status: { not: "DONE" },
      ...(user.role === "ADMIN"
        ? {}
        : memberVisibleTaskWhere(user)),
    },
    include: taskInclude,
    orderBy: { dueDate: "asc" },
  });
};

module.exports = {
  addComment,
  assignTask,
  changeTaskStatus,
  createTask,
  deleteTask,
  getTaskById,
  getTasks,
  getOverdueTasks,
  updateTask,
};
