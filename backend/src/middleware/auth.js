const jwt = require("jsonwebtoken");
const prisma = require("../prisma/client");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    throw new ApiError(401, "Authentication token is required");
  }

  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      bloodGroup: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new ApiError(401, "Authenticated user no longer exists");
  }

  req.user = user;
  next();
});

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, "Authentication is required"));
  }

  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, "You do not have permission to perform this action"));
  }

  next();
};

module.exports = { authenticate, requireRole };
