const jwt = require("jsonwebtoken");

module.exports = (user, secret, exp) => {
  const { id, name, roles_id, is_priviledged, shops_id } = user;
  return jwt.sign(
    {
      id,
      name,
      roles_id,
      is_priviledged,
      shops_id,
    },
    secret,
    { expiresIn: exp }
  );
};
