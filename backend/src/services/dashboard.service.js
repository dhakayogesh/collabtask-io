const prisma = require("../prisma/client");

const accessibleTaskWhere = (user) =>
  user.role === "ADMIN"
    ? {}
    : {
        OR: [
          { assignmentType: "TEAM" },
          { assignedToId: user.id },
        ],
      };

const getTaskStatistics = async (user) => {
  const where = accessibleTaskWhere(user);
  const [total, completed, inProgress, backlog, overdue, assignedToMe, activeProjects] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.count({ where: { ...where, status: "DONE" } }),
    prisma.task.count({ where: { ...where, status: "IN_PROGRESS" } }),
    prisma.task.count({ where: { ...where, status: "TODO" } }),
    prisma.task.count({
      where: {
        ...where,
        dueDate: { lt: new Date() },
        status: { not: "DONE" },
      },
    }),
    prisma.task.count({
      where: {
        ...where,
        status: { not: "DONE" },
        OR: [{ assignmentType: "TEAM" }, { assignedToId: user.id }],
      },
    }),
    prisma.project.count({
      where:
        user.role === "ADMIN"
          ? undefined
          : {
              members: {
                some: { userId: user.id },
              },
            },
    }),
  ]);

  return {
    total,
    completed,
    inProgress,
    backlog,
    active: total - completed,
    overdue,
    assignedToMe,
    activeProjects,
    completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
};

const getTasksByStatus = async (user) => {
  const where = accessibleTaskWhere(user);
  const grouped = await prisma.task.groupBy({
    by: ["status"],
    where,
    _count: { status: true },
  });

  return {
    TODO: 0,
    IN_PROGRESS: 0,
    DONE: 0,
    ...Object.fromEntries(grouped.map((row) => [row.status, row._count.status])),
  };
};

const getOverdueCounts = async (user) => {
  const where = accessibleTaskWhere(user);
  const now = new Date();

  const [totalOverdue, overdueByProject] = await Promise.all([
    prisma.task.count({
      where: {
        ...where,
        dueDate: { lt: now },
        status: { not: "DONE" },
      },
    }),
    prisma.task.groupBy({
      by: ["projectId"],
      where: {
        ...where,
        dueDate: { lt: now },
        status: { not: "DONE" },
      },
      _count: { projectId: true },
    }),
  ]);

  const projectIds = overdueByProject.map((row) => row.projectId);
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true },
  });
  const projectMap = new Map(projects.map((project) => [project.id, project.name]));

  return {
    totalOverdue,
    byProject: overdueByProject.map((row) => ({
      projectId: row.projectId,
      projectName: projectMap.get(row.projectId) || "Unknown project",
      count: row._count.projectId,
    })),
  };
};

const getUpcomingDeadlines = async (user) => {
  return prisma.task.findMany({
    where: {
      ...accessibleTaskWhere(user),
      dueDate: { not: null },
      status: { not: "DONE" },
    },
    include: {
      project: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 5,
  });
};

const getAssignedTasks = async (user) => {
  return prisma.task.findMany({
    where: {
      ...accessibleTaskWhere(user),
      OR: [{ assignmentType: "TEAM" }, { assignedToId: user.id }],
      status: { not: "DONE" },
    },
    include: {
      project: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 6,
  });
};

const getRecentActivity = async (user) => {
  const projectWhere =
    user.role === "ADMIN"
      ? {}
      : {
          members: {
            some: { userId: user.id },
          },
        };

  const [tasks, projects] = await Promise.all([
    prisma.task.findMany({
      where: accessibleTaskWhere(user),
      include: {
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.project.findMany({
      where: projectWhere,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return [
    ...tasks.map((task) => ({
      id: `task-${task.id}`,
      type: "TASK_CREATED",
      message: `created task ${task.title}`,
      createdAt: task.createdAt,
      actor: task.createdBy,
      project: task.project,
    })),
    ...projects.map((project) => ({
      id: `project-${project.id}`,
      type: "PROJECT_CREATED",
      message: `created project ${project.name}`,
      createdAt: project.createdAt,
      actor: project.createdBy,
      project: { id: project.id, name: project.name },
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8);
};

module.exports = {
  getAssignedTasks,
  getOverdueCounts,
  getRecentActivity,
  getTaskStatistics,
  getTasksByStatus,
  getUpcomingDeadlines,
};
