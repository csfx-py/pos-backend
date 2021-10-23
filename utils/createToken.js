const jwt = require("jsonwebtoken");

module.exports = (user, secret, exp) => {
  console.log(user);
  const { name, role, is_priviledged } = user;
  return jwt.sign(
    {
      name,
      role,
      is_priviledged,
    },
    secret,
    { expiresIn: exp }
  );
};
