const prisma = require("../prisma/client");
const ApiError = require("../utils/apiError");

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
};

const getTeam = async (_user, filters = {}) => {
  const where = {};
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [users, openTasks, teamTasks] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.task.groupBy({
      by: ["assignedToId"],
      where: {
        assignedToId: { not: null },
        assignmentType: "USER",
        status: { not: "DONE" },
      },
      _count: { assignedToId: true },
    }),
    prisma.task.findMany({
      where: {
        assignmentType: "TEAM",
        status: { not: "DONE" },
      },
      select: { id: true },
    }),
  ]);

  const loadByUser = new Map(openTasks.map((row) => [row.assignedToId, row._count.assignedToId]));
  teamTasks.forEach((task) => {
    users.forEach((user) => {
      loadByUser.set(user.id, (loadByUser.get(user.id) ?? 0) + 1);
    });
  });

  return users.map((user) => {
    const openTaskCount = loadByUser.get(user.id) ?? 0;

    return {
      ...user,
      openTaskCount,
      activityStatus: openTaskCount > 0 ? "ACTIVE" : "IDLE",
    };
  });
};

const ensureUserCanBeDeleted = async (targetUserId, actor) => {
  if (targetUserId === actor.id) {
    throw new ApiError(400, "You cannot delete your own account");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: userSelect,
  });

  if (!target) throw new ApiError(404, "User not found");

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new ApiError(400, "You cannot delete the last admin account");
    }
  }

  return target;
};

const deleteUser = async (targetUserId, actor) => {
  await ensureUserCanBeDeleted(targetUserId, actor);

  return prisma.$transaction(async (tx) => {
    await tx.task.updateMany({
      where: { createdById: targetUserId },
      data: { createdById: actor.id },
    });

    await tx.project.updateMany({
      where: { createdById: targetUserId },
      data: { createdById: actor.id },
    });

    await tx.task.updateMany({
      where: { assignedToId: targetUserId },
      data: { assignedToId: null, assignmentType: "UNASSIGNED" },
    });

    await tx.projectMember.deleteMany({
      where: { userId: targetUserId },
    });

    await tx.user.delete({
      where: { id: targetUserId },
    });

    return { id: targetUserId };
  });
};

const updateRole = async (targetUserId, role, actor) => {
  if (!["ADMIN", "MEMBER"].includes(role)) {
    throw new ApiError(422, "Role must be ADMIN or MEMBER", { role: ["Role must be ADMIN or MEMBER"] });
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: userSelect,
  });

  if (!target) throw new ApiError(404, "User not found");

  if (target.role === "ADMIN" && role === "MEMBER") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new ApiError(400, "You cannot demote the last admin account");
    }
  }

  if (target.id === actor.id && target.role === "ADMIN" && role === "MEMBER") {
    throw new ApiError(400, "You cannot demote your own admin account");
  }

  return prisma.user.update({
    where: { id: targetUserId },
    data: { role },
    select: userSelect,
  });
};

module.exports = { deleteUser, getTeam, updateRole };
