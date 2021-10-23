const router = require("express").Router();
const pool = require("../../db");
const verifyAdmin = require("../../utils/verifyAdmin");

router.get("/brand", async (req, res) => {
  try {
    const brandList = await pool.query("SELECT name FROM brands ORDER BY name");
    if (brandList.rowCount === 0)
      return res.status(404).send("brands list empty");

    return res.status(200).send(brandList.rows);
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal server error");
  }
});

router.get("/category", async (req, res) => {
  try {
    const categoryList = await pool.query(
      "SELECT name FROM categories ORDER BY name"
    );
    if (categoryList.rowCount === 0)
      return res.status(404).send("categories list empty");

    return res.status(200).send(categoryList.rows);
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal server error");
  }
});

router.get("/size", async (req, res) => {
  try {
    const sizeList = await pool.query("SELECT size FROM sizes ORDER BY size");
    if (sizeList.rowCount === 0)
      return res.status(404).send("item sizes list empty");

    return res.status(200).send(sizeList.rows);
  } catch (err) {
    return res.status(500).send("Internal server error");
  }
});

router.get("/items", async (req, res) => {
  try {
    const itemList = await pool.query(
      `SELECT * FROM products 
      ORDER BY category, name`
    );
    if (itemList.rowCount === 0)
      return res.status(404).send("Master items list empty");

    return res.status(200).send(itemList.rows);
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal server error");
  }
});

// ---------------------------------------------------------------------------

router.post("/brand", verifyAdmin, async (req, res) => {
  const { name } = req.body;
  //   check exists
  const brandList = await pool.query("SELECT * FROM brands WHERE name = $1", [
    name,
  ]);
  if (brandList.rowCount > 0)
    return res.status(401).send("brand already registered");

  try {
    //   insert brand
    const saved = await pool.query(
      "INSERT INTO brands (name) VALUES ($1) RETURNING name",
      [name]
    );

    res.status(200).send("Success");
  } catch (err) {
    return res.status(500).send("Internal Server Error");
  }
});

router.post("/category", verifyAdmin, async (req, res) => {
  const { name } = req.body;
  try {
    //   check exists
    const categoryList = await pool.query(
      "SELECT * FROM categories WHERE name = $1",
      [name]
    );
    if (categoryList.rowCount > 0)
      return res.status(401).send("category already registered");

    //   insert category
    const saved = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) RETURNING name",
      [name]
    );

    res.status(200).send("Success");
  } catch (err) {
    return res.status(500).send("Internal Server Error");
  }
});

router.post("/size", verifyAdmin, async (req, res) => {
  const { size } = req.body;
  try {
    //   check exists
    const sizeList = await pool.query("SELECT * FROM sizes WHERE size = $1", [
      size,
    ]);
    if (sizeList.rowCount > 0)
      return res.status(401).send("size already registered");

    //   insert size
    const saved = await pool.query(
      "INSERT INTO sizes (size) VALUES ($1) RETURNING size",
      [size]
    );

    res.status(200).send(`${size} size saved`);
  } catch (err) {
    return res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
