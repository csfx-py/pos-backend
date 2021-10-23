const router = require("express").Router();
const pool = require("../../db");
const splitInvoice = require("../Utils/splitInvoice");
const verifyManager = require("../Utils/verifyManager");
const verifyShop = require("../Utils/verifyShop");

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
          WHERE item = $1 
          AND shop = $2 
          AND purchase_date = $3`,
          [products_id, shop_id, purchase_date]
        );
        if (checkList.rowCount > 0) {
          existLog.push({ item });
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
          RETURNING item`,
          [ shop_id, products_id, itemList.rows[0].purchase_price, qty_case, qty_item, purchase_date]
        );
        if (saved.rowCount) {
          saveLog.push({ item });
          const activeQty = await pool.query(
            `SELECT qty FROM shop_items WHERE item = $1 AND shop = $2`,
            [products_id, shop_id]
          );
          if (activeQty.rowCount) {
            if(qty_case==0){
              const newQty = parseFloat(activeQty.rows[0].qty) + parseFloat(qty_item);
            }else if(qty_item==0){
              qty=qty_case*itemList.rows[0].per_case;
              const newQty = parseFloat(activeQty.rows[0].qty) + parseFloat(qty);
            }
            const updateActive = await pool.query(
              `UPDATE shop_items set qty = $1 WHERE item = $2 AND shop = $3`,
              [newQty, products_id, shop_id]
            );
            continue;
          }
          const addActive = await pool.query(
            `INSERT INTO shop_items( shop, item, qty )
            VALUES ( $1, $2, $3 )`,
            [shop_id, products_id, qty]
          );
        }
      } catch (err) {
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
