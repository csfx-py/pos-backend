const router = require("express").Router();
const pool = require("../../db");
const verifyAdmin = require("../../utils/verifyAdmin");

router.get("/brand", async (req, res) => {
  try {
    const brandList = await pool.query("SELECT * FROM brands ORDER BY name");
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
      "SELECT * from categories ORDER BY name"
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
    const sizeList = await pool.query("SELECT * FROM sizes ORDER BY size");
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
      `select p.id as id, p.name as name, p.barcode, p.categories_id, c.name as categories_name, 
      si.id as sizes_id, si.size, p.brands_id, b.name as brands_name, p.purchase_price, p.case_price,
      p.discount, p.mrp, p.mrp1, p.mrp2, p.mrp3, p.mrp4
      from products p
      Left join categories c on c.id = p.categories_id
      Left join sizes si on si.id = p.sizes_id
      Left join brands b on b.id = p.brands_id
      order by p.categories_id, p.name`
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

// insert products rout
router.post("/products", verifyAdmin, async (req, res) => {
  let existLog = [];
  let saveLog = [];
  let errLog = [];
  const data = req.body;
  if (data) {
    const {
      name,
      brands_id,
      categories_id,
      sizes_id,
      barcode,
      purchase_price,
      case_qty,
      case_price,
      discount,
      mrp,
      mrp1,
      mrp2,
      mrp3,
      mrp4,
    } = data;
    try {
      // begin transaction
      await pool.query("BEGIN");
      const itemList = await pool.query(
        `insert into products( name, brands_id, categories_id, sizes_id, barcode, purchase_price, case_qty, case_price, discount, mrp, mrp1, mrp2, mrp3, mrp4 )
          VALUES( $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14 ) RETURNING id`,
        [
          name,
          brands_id || null,
          categories_id,
          sizes_id,
          barcode,
          purchase_price,
          case_qty,
          case_price,
          discount || 0,
          mrp,
          mrp1,
          mrp2,
          mrp3,
          mrp4,
        ]
      );
      if (itemList.rowCount) {
        let id = itemList.rows[0].id;
        saveLog.push({ id });
        await pool.query("COMMIT");
      } else {
        errLog.push({ id });
        await pool.query("ROLLBACK");
      }
    } catch (error) {
      console.log(error);
      await pool.query("ROLLBACK");
      errLog.push({ name });
    }
    return res.status(200).send({
      exist: existLog,
      save: saveLog,
      err: errLog,
    });
  }
});

// insert xl products rout
router.post("/xl-products", verifyAdmin, async (req, res) => {
  let existLog = [];
  let saveLog = [];
  let errLog = [];
  const data = req.body;
  if (data && data.length > 0) {
    for (i = 0; i < data.length; i++) {
      const {
        name,
        brand,
        category,
        size,
        barcode,
        purchase_price,
        case_qty,
        case_price,
        discount,
        mrp,
        mrp1,
        mrp2,
        mrp3,
        mrp4,
      } = data[i];
      try {
        // begin transaction
        await pool.query("BEGIN");
        const brands = await pool.query(`select id from brands where name=$1`, [
          brand,
        ]);
        const categories = await pool.query(
          `select id from categories where name=$1`,
          [category]
        );
        const sizes = await pool.query(`select id from sizes where size=$1`, [
          size,
        ]);
        const insertProduct = await pool.query(
          `insert into products( name, brands_id, categories_id, sizes_id, barcode, purchase_price, case_qty, case_price, discount, mrp, mrp1, mrp2, mrp3, mrp4 )
          VALUES( $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14 ) RETURNING id`,
          [
            name,
            brands.rows[0]?.id || null,
            categories.rows[0].id,
            sizes.rows[0].id,
            barcode || null,
            purchase_price,
            case_qty,
            case_price,
            discount || 0,
            mrp,
            mrp1 || null,
            mrp2 || null,
            mrp3 || null,
            mrp4 || null,
          ]
        );
        if (insertProduct.rowCount) {
          let id = insertProduct.rows[0].id;
          saveLog.push({ id });
          await pool.query("COMMIT");
        } else {
          errLog.push({ id });
          await pool.query("ROLLBACK");
        }
      } catch (error) {
        console.log(error);
        await pool.query("ROLLBACK");
        errLog.push({ name });
      }
    }
    return res.status(200).send({
      exist: existLog,
      save: saveLog,
      err: errLog,
    });
  }
});

router.put("/modify", verifyAdmin, async (req, res) => {
  const { id, field, newVal } = req.body;
  try {
    const modify = await pool.query(
      `UPDATE products SET ${field}=$1 WHERE id=$2 RETURNING id`,
      [newVal, id]
    );
    if (modify.rowCount) {
      return res.status(200).send({
        id: modify.rows[0].id,
        field: field,
        newVal: newVal,
      });
    }
    return res.status(401).send("modify failed");
  } catch (error) {
    return res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
