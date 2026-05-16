const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const signup = asyncHandler(async (req, res) => {
  const result = await authService.signup(req.body);
  sendSuccess(res, result, "Signup successful", 201);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  sendSuccess(res, result, "Login successful");
});

const me = asyncHandler(async (req, res) => {
  sendSuccess(res, { user: req.user }, "Authenticated user");
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.body);
  sendSuccess(res, { user }, "Profile updated");
});

module.exports = { login, me, signup, updateMe };
