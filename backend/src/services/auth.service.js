const bcrypt = require("bcrypt");
const prisma = require("../prisma/client");
const ApiError = require("../utils/apiError");
const { signToken } = require("../utils/jwt");
const { sanitizeUser } = require("../utils/sanitize");

const ADMIN_PASSCODE = "admin@123";
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const normalizeOptionalString = (value) => {
  const trimmed = typeof value === "string" ? value.trim() : null;
  return trimmed === "" ? null : trimmed;
};

const signup = async ({ name, email, password, role, adminPasscode }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const requestedRole = role === "ADMIN" ? "ADMIN" : "MEMBER";
  if (requestedRole === "ADMIN") {
    if (!adminPasscode) {
      throw new ApiError(401, "Admin passcode is required", {
        adminPasscode: ["Admin passcode is required"],
      });
    }

    if (adminPasscode !== ADMIN_PASSCODE) {
      throw new ApiError(403, "Invalid admin passcode", {
        adminPasscode: ["Invalid admin passcode"],
      });
    }
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const [passwordHash, userCount] = await Promise.all([
    bcrypt.hash(password, 12),
    prisma.user.count(),
  ]);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: passwordHash,
      role: role ? requestedRole : userCount === 0 ? "ADMIN" : "MEMBER",
    },
  });

  return {
    user: sanitizeUser(user),
    token: signToken(user),
  };
};

const login = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) {
    throw new ApiError(401, "Invalid email or password");
  }

  return {
    user: sanitizeUser(user),
    token: signToken(user),
  };
};

const updateProfile = async (userId, { name, phone, address, bloodGroup }) => {
  const safeName = typeof name === "string" ? name.trim() : "";
  const safePhone = normalizeOptionalString(phone);
  const safeAddress = normalizeOptionalString(address);
  const safeBloodGroup = normalizeOptionalString(bloodGroup);

  if (!safeName) {
    throw new ApiError(422, "Validation failed", {
      name: ["name is required"],
    });
  }

  if (safeBloodGroup !== null && !BLOOD_GROUPS.includes(safeBloodGroup)) {
    throw new ApiError(422, "Validation failed", {
      bloodGroup: [`bloodGroup must be one of: ${BLOOD_GROUPS.join(", ")}`],
    });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: safeName,
      phone: safePhone,
      address: safeAddress,
      bloodGroup: safeBloodGroup,
    },
  });

  return sanitizeUser(user);
};

module.exports = { signup, login, updateProfile };
