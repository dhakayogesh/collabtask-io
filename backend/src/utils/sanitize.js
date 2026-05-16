const sanitizeUser = (user) => {
  if (!user) return user;

  const { password, ...safeUser } = user;

  return safeUser;
};

module.exports = { sanitizeUser };
