const ApiError = require("../utils/apiError");

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const validators = {
  required: (value) => value !== undefined && value !== null && value !== "",
  string: (value) => typeof value === "string",
  email: (value) => typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  min: (value, min) => typeof value === "string" && value.trim().length >= min,
  max: (value, max) => typeof value === "string" && value.trim().length <= max,
  phone: (value) => {
    if (typeof value !== "string") return false;
    const normalized = value.trim().replace(/\s+/g, " ");
    return /^(?:\+91\s?)?[6-9]\d{4}\s?\d{5}$/.test(normalized);
  },
  id: (value) => typeof value === "string" && /^[a-z0-9_-]{8,64}$/i.test(value),
  uuid: (value) =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  enum: (value, allowed) => allowed.includes(value),
  date: (value) => value === undefined || value === null || !Number.isNaN(Date.parse(value)),
};

const validate = (schema, source = "body") => (req, res, next) => {
  const payload = req[source];

  if (!isObject(payload)) {
    return next(new ApiError(400, "Invalid request payload"));
  }

  const errors = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = payload[field];
    const isRequired = rules.some((rule) => (Array.isArray(rule) ? rule[0] : rule) === "required");

    if (!isRequired && (value === undefined || value === null || value === "")) {
      continue;
    }

    for (const rule of rules) {
      const [name, arg] = Array.isArray(rule) ? rule : [rule];
      const valid = validators[name]?.(value, arg);

      if (!valid) {
        errors[field] = errors[field] || [];
        errors[field].push(validationMessage(field, name, arg));
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return next(new ApiError(422, "Validation failed", errors));
  }

  next();
};

const validationMessage = (field, rule, arg) => {
  const messages = {
    required: `${field} is required`,
    string: `${field} must be a string`,
    email: `${field} must be a valid email address`,
    min: `${field} must be at least ${arg} characters`,
    max: `${field} must be at most ${arg} characters`,
    phone: `${field} must be a valid phone number`,
    id: `${field} must be a valid ID`,
    uuid: `${field} must be a valid UUID`,
    enum: `${field} must be one of: ${Array.isArray(arg) ? arg.join(", ") : ""}`,
    date: `${field} must be a valid date`,
  };

  return messages[rule] || `${field} is invalid`;
};

module.exports = validate;
