const express = require("express");
const projectController = require("../controllers/project.controller");
const { authenticate, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

const projectIdParam = {
  projectId: ["required", "id"],
};

const removeMemberParams = {
  projectId: ["required", "id"],
  userId: ["required", "id"],
};

const createProjectSchema = {
  name: ["required", "string", ["min", 2], ["max", 120]],
  description: ["string", ["max", 1000]],
};

const addMemberSchema = {
  userId: ["required", "id"],
};

router.use(authenticate);

router
  .route("/")
  .get(projectController.getProjects)
  .post(requireRole("ADMIN"), validate(createProjectSchema), projectController.createProject);

router
  .route("/:projectId")
  .get(validate(projectIdParam, "params"), projectController.getProjectById)
  .delete(requireRole("ADMIN"), validate(projectIdParam, "params"), projectController.deleteProject);

router.get(
  "/:projectId/members",
  validate(projectIdParam, "params"),
  projectController.getProjectMembers,
);

router.post(
  "/:projectId/members",
  requireRole("ADMIN"),
  validate(projectIdParam, "params"),
  validate(addMemberSchema),
  projectController.addMember,
);
router.delete(
  "/:projectId/members/:userId",
  requireRole("ADMIN"),
  validate(removeMemberParams, "params"),
  projectController.removeMember,
);

module.exports = router;
