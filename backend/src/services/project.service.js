const prisma = require("../prisma/client");
const ApiError = require("../utils/apiError");
const { notifyProjectMemberAdded } = require("./notification.service");

const projectInclude = {
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  tasks: { select: { id: true, status: true } },
  members: {
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  },
  _count: { select: { tasks: true, members: true } },
};

const ensureProjectAccess = async (projectId, user) => {
  if (user.role === "ADMIN") {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new ApiError(404, "Project not found");
    return project;
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });

  if (!membership) {
    throw new ApiError(404, "Project not found");
  }

  return membership;
};

const createProject = async ({ name, description }, user) => {
  return prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      createdById: user.id,
      members: {
        create: { userId: user.id },
      },
    },
    include: projectInclude,
  });
};

const getProjects = async (user, filters = {}) => {
  const where =
    user.role === "ADMIN"
      ? {}
      : {
          members: {
            some: { userId: user.id },
          },
        };

  if (filters.search) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ],
      },
    ];
  }

  return prisma.project.findMany({
    where,
    include: projectInclude,
    orderBy: { createdAt: "desc" },
  });
};

const getProjectById = async (projectId, user) => {
  await ensureProjectAccess(projectId, user);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      ...projectInclude,
      tasks: {
        where:
          user.role === "ADMIN"
            ? undefined
            : {
                OR: [
                  { assignmentType: "TEAM" },
                  { assignedToId: user.id },
                ],
              },
        include: {
          assignedTo: { select: { id: true, name: true, email: true, role: true } },
          createdBy: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) throw new ApiError(404, "Project not found");
  return project;
};

const getProjectMembers = async (projectId, user) => {
  await ensureProjectAccess(projectId, user);

  return prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
    },
    orderBy: { createdAt: "asc" },
  });
};

const addMember = async (projectId, userId, actor) => {
  await ensureProjectAccess(projectId, actor);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  const member = await prisma.projectMember.create({
    data: { projectId, userId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      project: { select: { id: true, name: true } },
    },
  });

  await notifyProjectMemberAdded(member, actor);

  return member;
};

const removeMember = async (projectId, userId, actor) => {
  await ensureProjectAccess(projectId, actor);

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (!member) throw new ApiError(404, "Project member not found");

  const memberCount = await prisma.projectMember.count({ where: { projectId } });
  if (memberCount <= 1) {
    throw new ApiError(400, "A project must keep at least one member");
  }

  await prisma.$transaction([
    prisma.task.updateMany({
      where: { projectId, assignedToId: userId },
      data: { assignedToId: null, assignmentType: "UNASSIGNED" },
    }),
    prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    }),
  ]);

  return { projectId, userId };
};

const deleteProject = async (projectId, actor) => {
  await ensureProjectAccess(projectId, actor);

  await prisma.project.delete({
    where: { id: projectId },
  });

  return { id: projectId };
};

module.exports = {
  addMember,
  createProject,
  deleteProject,
  ensureProjectAccess,
  getProjectById,
  getProjectMembers,
  getProjects,
  removeMember,
};
