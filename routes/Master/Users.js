const router = require("express").Router();
const bcrypt = require("bcrypt");
const pool = require("../../db");
const verifyAdmin = require("../../utils/verifyAdmin");
const verifyMaster = require("../../utils/verifyMaster");
const createToken = require("../../utils/createToken");

// get all users
router.get("/users", verifyAdmin, async (req, res) => {
  try {
    const userList = await pool.query(`SELECT  FROM users`);
    if (userList.rowCount === 0) return res.status(404).send("Not found");

    return res.status(200).send(userList.rows);
  } catch (error) {
    return res.status(500).send("Internal server error");
  }
});

router.post("/register-admin", verifyMaster, async (req, res) => {
  const { name, password } = req.body;

  try {
    //   check exists
    const userList = await pool.query(`SELECT * FROM users WHERE roles_id = 1`);
    if (userList.rowCount > 0)
      return res.status(400).send("Admin already exists");

    //   hash password
    const salt = await bcrypt.genSalt(10);
    const hashPass = await bcrypt.hash(password, salt);

    //   insert user
    const user = await pool.query(
      `INSERT INTO users (
      name, password, roles_id, is_priviledged
      ) VALUES (
        $1, $2, 1, true
      ) returning name, roles_id`,
      [name, hashPass]
    );

    if (user.rowCount === 0) return res.status(400).send("Failed to register");

    res
      .cookie(
        "lid",
        createToken(user.rows[0], process.env.REFRESH_TOKEN_SEC, "30d"),
        {
          httpOnly: true,
        }
      )
      .status(200)
      .send(createToken(user.rows[0], process.env.ACCESS_TOKEN_SEC, "2h"));
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
});

// Create a new user
router.post("/register", verifyAdmin, async (req, res) => {
  const { name, roles_id, password, is_priviledged } = req.body;

  try {
    //   check exists
    const userList = await pool.query(`SELECT * FROM users WHERE name = $1`, [
      name,
    ]);
    if (userList.rowCount > 0)
      return res.status(401).send("User already registered");
    //   encrypt pass
    const salt = await bcrypt.genSalt(10);
    const hashPass = await bcrypt.hash(password, salt);

    //   insert user
    const user = await pool.query(
      `INSERT INTO users (
        name, password, roles_id, is_priviledged
        ) VALUES (
          $1, $2, $3, $4
        ) returning name, roles_id`,
      [name, hashPass, roles_id || 2, is_priviledged || false]
    );

    res
      .cookie(
        "lid",
        createToken(user.rows[0], process.env.REFRESH_TOKEN_SEC, "30d"),
        {
          httpOnly: true,
        }
      )
      .status(200)
      .send(createToken(user.rows[0], process.env.ACCESS_TOKEN_SEC, "2h"));
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
});

// Create a new user
router.post("/domains", verifyAdmin, async (req, res) => {
  res.send("/domains");
});

module.exports = router;
