const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../../db");
const createToken = require("../../utils/createToken");
// Login
router.post("/login", async (req, res) => {
  const { name, password } = req.body;
  try {
    //   check exists
    const userList = await pool.query(
      `SELECT u.id, u.name, u.password, u.roles_id, 
      u.is_priviledged, array_agg(d.shops_id) shops_id
      FROM users u 
      LEFT JOIN domains d 
      ON d.users_id=u.id WHERE name = $1 
      GROUP BY u.id, u.name, u.password, u.roles_id,
      u.is_priviledged`,
      [name]
    );
    if (!userList.rowCount) return res.status(401).send("User not registered");

    const user = userList.rows[0];

    // authenticate
    const authenticaed = await bcrypt.compare(password, user.password);

    if (!authenticaed) return res.status(403).send("Incorrect password");

    res
      .cookie("lid", createToken(user, process.env.REFRESH_TOKEN_SEC, "30d"), {
        httpOnly: true,
      })
      .status(200)
      .send(createToken(user, process.env.ACCESS_TOKEN_SEC, "2h"));
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal server error");
  }
});

// refresh jwt
router.post("/refresh", async (req, res) => {
  const token = req.cookies.lid;
  // check token
  if (!token) return res.status(401).send("Not Authorised");

  let payload = null;
  // verify token
  try {
    payload = jwt.verify(token, process.env.REFRESH_TOKEN_SEC);
  } catch (err) {
    return res.status(401).send("Not Authorised");
  }
  try {
    const { name } = payload;
    // check user
    const userList = await pool.query(
      `SELECT u.id, u.name, u.password, u.roles_id, 
    u.is_priviledged, array_agg(d.shops_id) shops_id
    FROM users u 
    LEFT JOIN domains d 
    ON d.users_id=u.id WHERE name = $1 
    GROUP BY u.id, u.name, u.password, u.roles_id,
    u.is_priviledged`,
      [name]
    );

    if (!userList.rowCount) return res.status(401).send("Not Authorised");

    const user = userList.rows[0];

    // generate token
    return res
      .cookie("lid", createToken(user, process.env.REFRESH_TOKEN_SEC, "30d"), {
        httpOnly: true,
      })
      .send(createToken(user, process.env.ACCESS_TOKEN_SEC, "2h"));
  } catch (error) {
    return res.status(500).send("Internal server error");
  }
});

module.exports = router;
