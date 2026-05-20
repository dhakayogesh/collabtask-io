const express = require("express");
const authRoutes = require("./auth.routes");
const dashboardRoutes = require("./dashboard.routes");
const projectRoutes = require("./project.routes");
const taskRoutes = require("./task.routes");
const teamRoutes = require("./team.routes");
const notificationRoutes = require("./notification.routes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API is healthy",
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

router.use("/auth", authRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/team", teamRoutes);
router.use("/notifications", notificationRoutes);

module.exports = router;
