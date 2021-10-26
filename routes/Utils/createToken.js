const jwt = require("jsonwebtoken");

module.exports = (user, secret, exp) => {
  const { user_name, user_role, user_domain, user_is_manager } = user;
  return jwt.sign(
    {
      user_name,
      user_role,
      user_domain,
      user_is_manager,
    },
    secret,
    { expiresIn: exp }
  );
};
