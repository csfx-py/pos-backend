const jwt = require("jsonwebtoken");

module.exports = (user, secret, exp) => {
  const { name, roles_id, is_priviledged } = user;
  console.log(user);
  return jwt.sign(
    {
      name,
      roles_id,
      is_priviledged,
    },
    secret,
    { expiresIn: exp }
  );
};
