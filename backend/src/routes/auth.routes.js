const express = require("express");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

const signupSchema = {
  name: ["required", "string", ["min", 2], ["max", 80]],
  email: ["required", "email", ["max", 120]],
  password: ["required", "string", ["min", 8], ["max", 128]],
  role: [["enum", ["ADMIN", "MEMBER"]]],
  adminPasscode: ["string", ["max", 128]],
};

const loginSchema = {
  email: ["required", "email", ["max", 120]],
  password: ["required", "string", ["min", 8], ["max", 128]],
};

const profileSchema = {
  name: ["required", "string", ["min", 2], ["max", 80]],
  phone: ["string", "phone", ["max", 20]],
  address: ["string", ["max", 240]],
  bloodGroup: [["enum", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]]],
};

router.post("/signup", validate(signupSchema), authController.signup);
router.post("/login", validate(loginSchema), authController.login);
router.get("/me", authenticate, authController.me);
router.patch("/me", authenticate, validate(profileSchema), authController.updateMe);

module.exports = router;
