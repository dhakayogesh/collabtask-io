const prisma = require("../prisma/client");
const ApiError = require("../utils/apiError");
const { ensureProjectAccess } = require("./project.service");

const taskInclude = {
  project: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  assignedTo: { select: { id: true, name: true, email: true, role: true } },
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
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;
  if (["UNASSIGNED", "USER", "TEAM"].includes(filters.assignmentType)) where.assignmentType = filters.assignmentType;
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

const createTask = async (payload, user) => {
  await ensureProjectAccess(payload.projectId, user);
  const assignment = await normalizeAssignment(payload.projectId, payload);

  return prisma.task.create({
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

  return prisma.task.update({
    where: { id: taskId },
    data,
    include: taskInclude,
  });
};

const deleteTask = async (taskId, user) => {
  await ensureTaskAccess(taskId, user);
  await prisma.task.delete({ where: { id: taskId } });
  return { id: taskId };
};

const assignTask = async (taskId, payload, user) => {
  const task = await ensureTaskAccess(taskId, user);
  const assignment = await normalizeAssignment(task.projectId, payload);

  return prisma.task.update({
    where: { id: taskId },
    data: assignment,
    include: taskInclude,
  });
};

const changeTaskStatus = async (taskId, status, user) => {
  await ensureTaskAccess(taskId, user);

  return prisma.task.update({
    where: { id: taskId },
    data: { status },
    include: taskInclude,
  });
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
  assignTask,
  changeTaskStatus,
  createTask,
  deleteTask,
  getTasks,
  getOverdueTasks,
  updateTask,
};
