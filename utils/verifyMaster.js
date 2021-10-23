const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const secret = req.header("auth");
  if (!secret) return res.status(401).send("Unauthorized");

  try {
    if (secret !== process.env.REG_ADMIN_SEC)
      res.status(401).send("Unauthorized");

    next();
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
};
