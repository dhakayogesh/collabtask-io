const teamService = require("../services/team.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const getTeam = asyncHandler(async (req, res) => {
  const members = await teamService.getTeam(req.user, req.query);
  sendSuccess(res, { members }, "Team retrieved", 200, { count: members.length });
});

const deleteUser = asyncHandler(async (req, res) => {
  const result = await teamService.deleteUser(req.params.userId, req.user);
  sendSuccess(res, result, "Team member deleted");
});

const updateRole = asyncHandler(async (req, res) => {
  const member = await teamService.updateRole(req.params.userId, req.body.role, req.user);
  sendSuccess(res, { member }, "Team member role updated");
});

module.exports = { deleteUser, getTeam, updateRole };
