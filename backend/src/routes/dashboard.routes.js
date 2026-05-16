const express = require("express");
const dashboardController = require("../controllers/dashboard.controller");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", dashboardController.getDashboard);
router.get("/stats", dashboardController.getTaskStatistics);
router.get("/tasks-by-status", dashboardController.getTasksByStatus);
router.get("/overdue-counts", dashboardController.getOverdueCounts);

module.exports = router;
