const router = require("express").Router();
const pool = require("../../db");

router.get("/items", async (req, res) => {
  const { shops_id } = req.query;
  try {
    const priceList = await pool.query(
      `select * from shops where id=$1`,
      [shops_id]
    );
    const price = priceList.rows[0].price_to_use;

    const itemList = await pool.query(
      `select s.id as id, s.name as shop_name, p.id as products_id, p.name as products_name, 
      p.barcode, st.stock, p.categories_id, c.name as categories_name, 
      si.id as sizes_id, si.size, p.brands_id, b.name as brands_name, p.purchase_price, p.${price} as mrp, p.discount  
      from shops s  
      Left join stock st on st.shop_id = s.id
      Left join products p on p.id = st.products_id
      Left join categories c on c.id = p.categories_id
      Left join sizes si on si.id = p.sizes_id
      Left join brands b on b.id = p.brands_id
      where s.id=$1
      order by p.categories_id, p.name`,
      [shops_id]
    );
    if (itemList.rowCount === 0)
      return res.status(404).send("No Items found in Shop");

    return res.status(200).send(itemList.rows);
  } catch (error) {
    console.log(error)
    return res.status(500).send("Internal server error");
  }
});

// purchase route
router.post("/purchase", async (req, res) => {
  const data = req.body;
  let existLog = [];
  let saveLog = [];
  let errLog = [];

  if (data && data.length > 0) {
    for (i = 0; i < data.length; i++) {
      const { shop_id, products_id, purchase_date, qty_case, qty_item } = data[i];
      try {
        // check item exists
        const checkList = await pool.query(
          `SELECT * FROM purchase 
          WHERE products_id = $1 
          AND shops_id = $2 
          AND purchase_date = $3`,
          [products_id, shop_id, purchase_date]
        );
        if (checkList.rowCount > 0) {
          existLog.push({ products_id });
          continue;
        }
        // insert item
        const itemList = await pool.query(
          "SELECT * FROM products WHERE name = $1",
          [products_id]
        );
        const saved = await pool.query(
          `INSERT INTO purchase( shop_id, products_id, price, qty_case, qty_item, purchase_date) 
          VALUES ( $1, $2, $3, $4, $5 ) 
          RETURNING products_id`,
          [shop_id, products_id, itemList.rows[0].purchase_price, qty_case, qty_item, purchase_date]
        );
        if (saved.rowCount) {
          saveLog.push({ item });
          const qty = (qty_case * itemList.rows[0].per_case) + qty_item;
          const activeQty = await pool.query(
            `SELECT qty FROM shop_items WHERE item = $1 AND shop = $2`,
            [products_id, shop_id]
          );
          if (activeQty.rowCount) {
            const newQty = parseFloat(activeQty.rows[0].qty) + parseFloat(qty);
            const updateActive = await pool.query(
              `UPDATE stock set stock = $1 WHERE item = $2 AND shop = $3`,
              [newQty, products_id, shop_id]
            );
            continue;
          }
          const addActive = await pool.query(
            `INSERT INTO stock( shop_id, products_id, stock )
            VALUES ( $1, $2, $3 )`,
            [shop_id, products_id, qty]
          );
        }
      } catch (err) {
        console.log(error);
        errLog.push({ item });
        return;
      }
    }
    return res.status(200).send({
      exist: existLog,
      save: saveLog,
      err: errLog,
    });
  }
  return res.status(400).send("no data provided");
});

module.exports = router;
