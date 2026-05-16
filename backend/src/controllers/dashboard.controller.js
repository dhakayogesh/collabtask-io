const dashboardService = require("../services/dashboard.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const getTaskStatistics = asyncHandler(async (req, res) => {
  const statistics = await dashboardService.getTaskStatistics(req.user);
  sendSuccess(res, { statistics }, "Task statistics retrieved");
});

const getTasksByStatus = asyncHandler(async (req, res) => {
  const tasksByStatus = await dashboardService.getTasksByStatus(req.user);
  sendSuccess(res, { tasksByStatus }, "Tasks by status retrieved");
});

const getOverdueCounts = asyncHandler(async (req, res) => {
  const overdueCounts = await dashboardService.getOverdueCounts(req.user);
  sendSuccess(res, { overdueCounts }, "Overdue counts retrieved");
});

const getDashboard = asyncHandler(async (req, res) => {
  const [statistics, tasksByStatus, overdueCounts, upcomingDeadlines, assignedTasks, recentActivity] = await Promise.all([
    dashboardService.getTaskStatistics(req.user),
    dashboardService.getTasksByStatus(req.user),
    dashboardService.getOverdueCounts(req.user),
    dashboardService.getUpcomingDeadlines(req.user),
    dashboardService.getAssignedTasks(req.user),
    dashboardService.getRecentActivity(req.user),
  ]);

  sendSuccess(
    res,
    { statistics, tasksByStatus, overdueCounts, upcomingDeadlines, assignedTasks, recentActivity },
    "Dashboard retrieved",
  );
});

module.exports = { getDashboard, getOverdueCounts, getTaskStatistics, getTasksByStatus };
