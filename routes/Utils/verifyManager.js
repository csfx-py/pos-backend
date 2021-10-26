const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.header("auth");
  if (!token) return res.status(401).send("Unauthorized");

  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SEC);

    if (payload.user_role !== "manager" && payload.user_is_manager) res.status(401).send("Unauthorized");

    next();
  } catch (err) {
    res.status(401).send("Unauthorized. Error: " + err);
  }
};
