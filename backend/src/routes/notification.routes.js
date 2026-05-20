const express = require("express");
const notificationController = require("../controllers/notification.controller");
const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

const notificationIdParam = {
  notificationId: ["required", "id"],
};

router.use(authenticate);

router.get("/", notificationController.getNotifications);
router.patch("/read-all", notificationController.markAllAsRead);
router.patch("/:notificationId/read", validate(notificationIdParam, "params"), notificationController.markAsRead);

module.exports = router;
