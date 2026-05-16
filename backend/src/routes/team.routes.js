const express = require("express");
const teamController = require("../controllers/team.controller");
const { authenticate, requireRole } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

const userIdParam = {
  userId: ["required", "id"],
};

const roleSchema = {
  role: ["required", ["enum", ["ADMIN", "MEMBER"]]],
};

router.use(authenticate);

router.get("/", teamController.getTeam);
router.delete("/:userId", requireRole("ADMIN"), validate(userIdParam, "params"), teamController.deleteUser);
router.patch("/:userId/role", requireRole("ADMIN"), validate(userIdParam, "params"), validate(roleSchema), teamController.updateRole);

module.exports = router;
