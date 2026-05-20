const prisma = require("../prisma/client");
const ApiError = require("../utils/apiError");

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  read: true,
  data: true,
  createdAt: true,
};

const dueSoonWindowMs = 48 * 60 * 60 * 1000;

const isDueSoon = (dueDate) => {
  if (!dueDate) return false;
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  return due > now && due - now <= dueSoonWindowMs;
};

const getProjectMemberIds = async (projectId) => {
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  });

  return members.map((member) => member.userId);
};

const uniqueUserIds = (ids) => Array.from(new Set(ids.filter(Boolean)));

const createNotification = async ({ userId, type, title, message, data }) => {
  if (!userId) return null;

  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data ?? undefined,
    },
    select: notificationSelect,
  });
};

const createNotifications = async (notifications) => {
  const rows = notifications.filter((notification) => notification.userId);
  if (rows.length === 0) return;

  await prisma.notification.createMany({
    data: rows.map((notification) => ({
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data ?? undefined,
    })),
  });
};

const taskRecipientIds = async (task) => {
  if (task.assignmentType === "USER" && task.assignedToId) return [task.assignedToId];
  if (task.assignmentType === "TEAM") return getProjectMemberIds(task.projectId);
  return [];
};

const notifyTaskAssigned = async (task, actor) => {
  const recipientIds = uniqueUserIds(await taskRecipientIds(task));
  if (recipientIds.length === 0) return;

  await createNotifications(
    recipientIds.map((userId) => ({
      userId,
      type: "TASK_ASSIGNED",
      title: "Task assigned",
      message: `${actor.name || actor.email} assigned "${task.title}" to ${task.assignmentType === "TEAM" ? "the team" : "you"}.`,
      data: {
        taskId: task.id,
        projectId: task.projectId,
        actorId: actor.id,
      },
    })),
  );
};

const notifyTaskDueSoon = async (task) => {
  if (!isDueSoon(task.dueDate) || task.status === "DONE") return;

  const recipientIds = uniqueUserIds(await taskRecipientIds(task));
  if (recipientIds.length === 0) return;

  const dueDate = new Date(task.dueDate).toISOString();
  const notifications = [];

  for (const userId of recipientIds) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: "TASK_DUE_SOON",
        read: false,
        data: {
          path: ["taskId"],
          equals: task.id,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      notifications.push({
        userId,
        type: "TASK_DUE_SOON",
        title: "Task due soon",
        message: `"${task.title}" is due soon.`,
        data: {
          taskId: task.id,
          projectId: task.projectId,
          dueDate,
        },
      });
    }
  }

  await createNotifications(notifications);
};

const notifyTaskStatusChanged = async (task, previousStatus, actor) => {
  if (!previousStatus || previousStatus === task.status) return;

  const recipientIds = uniqueUserIds(await taskRecipientIds(task));
  if (recipientIds.length === 0) return;

  await createNotifications(
    recipientIds.map((userId) => ({
      userId,
      type: "TASK_STATUS_CHANGED",
      title: "Task status changed",
      message: `${actor.name || actor.email} moved "${task.title}" from ${previousStatus} to ${task.status}.`,
      data: {
        taskId: task.id,
        projectId: task.projectId,
        actorId: actor.id,
        previousStatus,
        status: task.status,
      },
    })),
  );
};

const notifyProjectMemberAdded = async (member, actor) => {
  await createNotification({
    userId: member.userId,
    type: "PROJECT_MEMBER_ADDED",
    title: "Added to project",
    message: `${actor.name || actor.email} added you to "${member.project.name}".`,
    data: {
      projectId: member.projectId,
      actorId: actor.id,
    },
  });
};

const getNotifications = async (user, filters = {}) => {
  const take = Math.min(Number(filters.limit) || 20, 50);
  const where = { userId: user.id };
  if (filters.unread === "true") where.read = false;

  const now = new Date();
  const soon = new Date(Date.now() + dueSoonWindowMs);
  const dueSoonTasks = await prisma.task.findMany({
    where: {
      dueDate: { gt: now, lte: soon },
      status: { not: "DONE" },
      OR: [
        { assignmentType: "TEAM" },
        { assignedToId: user.id },
      ],
    },
    select: {
      id: true,
      title: true,
      status: true,
      assignmentType: true,
      dueDate: true,
      projectId: true,
      assignedToId: true,
    },
  });

  for (const task of dueSoonTasks) {
    await notifyTaskDueSoon(task);
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: notificationSelect,
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.notification.count({
      where: { userId: user.id, read: false },
    }),
  ]);

  return { notifications, unreadCount };
};

const markAsRead = async (notificationId, user) => {
  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: user.id,
    },
    data: { read: true },
  });

  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId: user.id },
    select: notificationSelect,
  });

  if (!notification) throw new ApiError(404, "Notification not found");
  return notification;
};

const markAllAsRead = async (user) => {
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  return getNotifications(user);
};

module.exports = {
  getNotifications,
  markAllAsRead,
  markAsRead,
  notifyProjectMemberAdded,
  notifyTaskAssigned,
  notifyTaskDueSoon,
  notifyTaskStatusChanged,
};
