const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.header("auth");
  if (!token) return res.status(401).send("Unauthorized");

  try {
    const { roles_id } = jwt.verify(token, process.env.ACCESS_TOKEN_SEC);

    if (roles_id !== 2) res.status(401).send("Unauthorized");

    next();
  } catch (err) {
    res.status(401).send("Unauthorized. Error: " + err);
  }
};
