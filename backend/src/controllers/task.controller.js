const taskService = require("../services/task.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.body, req.user);
  sendSuccess(res, { task }, "Task created", 201);
});

const getTasks = asyncHandler(async (req, res) => {
  const tasks = await taskService.getTasks(req.query, req.user);
  sendSuccess(res, { tasks }, "Tasks retrieved", 200, { count: tasks.length });
});

const getTaskById = asyncHandler(async (req, res) => {
  const task = await taskService.getTaskById(req.params.taskId, req.user);
  sendSuccess(res, { task }, "Task retrieved");
});

const updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(req.params.taskId, req.body, req.user);
  sendSuccess(res, { task }, "Task updated");
});

const deleteTask = asyncHandler(async (req, res) => {
  const result = await taskService.deleteTask(req.params.taskId, req.user);
  sendSuccess(res, result, "Task deleted");
});

const assignTask = asyncHandler(async (req, res) => {
  const task = await taskService.assignTask(req.params.taskId, req.body, req.user);
  sendSuccess(res, { task }, "Task assigned");
});

const changeTaskStatus = asyncHandler(async (req, res) => {
  const task = await taskService.changeTaskStatus(req.params.taskId, req.body.status, req.user);
  sendSuccess(res, { task }, "Task status changed");
});

const getOverdueTasks = asyncHandler(async (req, res) => {
  const tasks = await taskService.getOverdueTasks(req.user);
  sendSuccess(res, { tasks }, "Overdue tasks retrieved", 200, { count: tasks.length });
});

const addComment = asyncHandler(async (req, res) => {
  const comment = await taskService.addComment(req.params.taskId, req.body.content, req.user);
  sendSuccess(res, { comment }, "Comment added", 201);
});

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
