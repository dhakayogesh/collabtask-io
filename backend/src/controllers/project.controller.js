const projectService = require("../services/project.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject(req.body, req.user);
  sendSuccess(res, { project }, "Project created", 201);
});

const getProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.getProjects(req.user, req.query);
  sendSuccess(res, { projects }, "Projects retrieved", 200, { count: projects.length });
});

const getProjectById = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.params.projectId, req.user);
  sendSuccess(res, { project }, "Project retrieved");
});

const getProjectMembers = asyncHandler(async (req, res) => {
  const members = await projectService.getProjectMembers(req.params.projectId, req.user);
  sendSuccess(res, { members }, "Project members retrieved", 200, { count: members.length });
});

const addMember = asyncHandler(async (req, res) => {
  const member = await projectService.addMember(req.params.projectId, req.body.userId, req.user);
  sendSuccess(res, { member }, "Member added", 201);
});

const removeMember = asyncHandler(async (req, res) => {
  const result = await projectService.removeMember(req.params.projectId, req.params.userId, req.user);
  sendSuccess(res, result, "Member removed");
});

const deleteProject = asyncHandler(async (req, res) => {
  const result = await projectService.deleteProject(req.params.projectId, req.user);
  sendSuccess(res, result, "Project deleted");
});

module.exports = {
  addMember,
  createProject,
  deleteProject,
  getProjectById,
  getProjectMembers,
  getProjects,
  removeMember,
};
