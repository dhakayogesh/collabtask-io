const express = require("express");
const taskController = require("../controllers/task.controller");
const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

const taskIdParam = {
  taskId: ["required", "id"],
};

const createTaskSchema = {
  title: ["required", "string", ["min", 2], ["max", 200]],
  description: ["string", ["max", 2000]],
  status: [["enum", ["TODO", "IN_PROGRESS", "DONE"]]],
  priority: [["enum", ["LOW", "MEDIUM", "HIGH"]]],
  dueDate: ["date"],
  projectId: ["required", "id"],
  assignmentType: [["enum", ["UNASSIGNED", "USER", "TEAM"]]],
  assignedToId: ["id"],
};

const updateTaskSchema = {
  title: ["string", ["min", 2], ["max", 200]],
  description: ["string", ["max", 2000]],
  status: [["enum", ["TODO", "IN_PROGRESS", "DONE"]]],
  priority: [["enum", ["LOW", "MEDIUM", "HIGH"]]],
  dueDate: ["date"],
  assignmentType: [["enum", ["UNASSIGNED", "USER", "TEAM"]]],
  assignedToId: ["id"],
};

const assignTaskSchema = {
  assignmentType: [["enum", ["UNASSIGNED", "USER", "TEAM"]]],
  assignedToId: ["id"],
};

const statusSchema = {
  status: ["required", ["enum", ["TODO", "IN_PROGRESS", "DONE"]]],
};

router.use(authenticate);

router.get("/", taskController.getTasks);
router.get("/overdue", taskController.getOverdueTasks);
router.post("/", validate(createTaskSchema), taskController.createTask);
router.patch("/:taskId", validate(taskIdParam, "params"), validate(updateTaskSchema), taskController.updateTask);
router.delete("/:taskId", validate(taskIdParam, "params"), taskController.deleteTask);
router.patch("/:taskId/assign", validate(taskIdParam, "params"), validate(assignTaskSchema), taskController.assignTask);
router.patch("/:taskId/status", validate(taskIdParam, "params"), validate(statusSchema), taskController.changeTaskStatus);

module.exports = router;
