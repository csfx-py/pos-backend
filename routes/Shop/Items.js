const router = require("express").Router();
const pool = require("../../db");
const splitInvoice = require("../../utils/splitInvoice");

router.get("/items", async (req, res) => {
  const { shops_id } = req.query;
  try {
    const priceList = await pool.query(`select * from shops where id=$1`, [
      shops_id,
    ]);
    const price = priceList.rows[0].price_to_use;

    const itemList = await pool.query(
      `select s.id as id, s.name as shop_name, p.id as products_id, p.name as products_name, 
      p.barcode, st.stock, p.categories_id, c.name as categories_name, 
      si.id as sizes_id, si.size, p.brands_id, b.name as brands_name, p.purchase_price, p.${price} as mrp, p.discount  
      from shops s  
      Left join stock st on st.shops_id = s.id
      join products p on p.id = st.products_id
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
    console.log(error);
    return res.status(500).send("Internal server error");
  }
});

// purchase route
router.post("/purchase", async (req, res) => {
  const data = req.body;
  let existLog = [];
  let saveLog = [];
  let errLog = [];
  // console.log(data);
  if (data && data.length > 0) {
    for (i = 0; i < data.length; i++) {
      const { shops_id, products_id, purchase_date, qty_case, qty_item } =
        data[i];
      try {
        // begin transaction
        await pool.query("BEGIN");
        // check item exists
        const checkList = await pool.query(
          `SELECT * FROM purchase 
          WHERE products_id = $1 
          AND shops_id = $2 
          AND purchase_date = $3`,
          [products_id, shops_id, purchase_date]
        );
        if (checkList.rowCount > 0) {
          existLog.push({ products_id });
          continue;
        }
        // insert item
        const itemList = await pool.query(
          "SELECT * FROM products WHERE id = $1",
          [products_id]
        );
        const saved = await pool.query(
          `INSERT INTO purchase( products_id, shops_id, price, qty_case, qty_item, purchase_date) 
          VALUES ( $1, $2, $3, $4, $5, $6 ) 
          RETURNING products_id`,
          [
            products_id,
            shops_id,
            itemList.rows[0].purchase_price,
            qty_case,
            qty_item,
            purchase_date,
          ]
        );

        if (saved.rowCount) {
          console.log("5");
          saveLog.push({ products_id });
          const qty = qty_case * itemList.rows[0].per_case + qty_item;
          const activeQty = await pool.query(
            `SELECT stock FROM stock WHERE products_id = $1 AND shops_id = $2`,
            [products_id, shops_id]
          );

          if (activeQty.rowCount) {
            const newQty = activeQty.rows[0].stock + qty;
            const updateActive = await pool.query(
              `UPDATE stock set stock = $1 WHERE products_id = $2 AND shops_id = $3`,
              [newQty, products_id, shops_id]
            );
          } else {
            const addActive = await pool.query(
              `INSERT INTO stock( shops_id, products_id, stock )
            VALUES ( $1, $2, $3 )`,
              [shops_id, products_id, qty]
            );
          }
          console.log("10");
          await pool.query("COMMIT");
        }
      } catch (err) {
        console.log(err);
        await pool.query("ROLLBACK");
        errLog.push({ products_id });
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

// purchase route
router.post("/sale", async (req, res) => {
  //   data featched:{
  //     "shops_id":1,
  //     "users_id":1,
  //     "transaction_type":"Cash",
  //     "items":[
  //         {
  //             "products_id":1,
  //             "qty":5,
  //             "price":1000
  //         },
  //         {
  //             "products_id":2,
  //             "qty":8,
  //             "price":980
  //         }
  //     ]
  // }

  const ta = req.body;
  // console.log(req.body);
  let saveLog = [];
  let errLog = [];
  // console.log(data.length);
  const { shops_id, users_id, transaction_type, items } = ta;
  // console.log(items);
  console.log("\n\n\n items:\n ", items);
  if (data && items.length > 0) {
    try {
      //begin transaction
      await pool.query("BEGIN");
      const brokenData = await splitInvoice(items);
      // console.log("\n\nbroken data : \n\n", brokenData);
      // console.log("\n\nbroken data length : \n\n", brokenData.length);

      for (i = 0; i < brokenData.length; i++) {
        const data = brokenData[i];
        // console.log(`\n\nbroken loop ${i} : \n`, brokenData[i]);
        const invoiceList = await pool.query(
          `SELECT * FROM invoices
          WHERE invoice_number = $1 and
          invoice_date = CURRENT_DATE`,
          [shops_id]
        );
        // invoice ID in formate yyyy-mm-dd-shop-invoice_no
        const invoice_number = `${new Date()
          .toISOString()
          .slice(0, 10)}-${shop}-${invoiceList.rowCount + 1}`;

        for (j = 0; j < data.length; j++) {
          // console.log(`\n\tbroken Data ${j} : \n\t`, data[j]);
          // saveLog.push(data[j].products_id);
          const invoiceSaved = await pool.query(
            `INSERT INTO invoices( sales_no, invoice_number, shops_id, users_id, products_id, qty, prices, total, transaction_type)
            VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, $9 )
            RETURNING sales_no`,
            [
              sales_no,
              invoice_number,
              shops_id,
              users_id,
              data[j].products_id,
              data[j].qty,
              data[j].price,
              data[j].total,
              transaction_type,
            ]
          );
          if (invoiceSaved.rowCount) {
            console.log("5");
            saveLog.push(data[j].products_id);
            const activeQty = await pool.query(
              `SELECT stock FROM stock WHERE products_id = $1 AND shops_id = $2`,
              [data[j].products_id, shops_id]
            );
            const salesQty = await pool.query(
              `SELECT qty, qty_cash, qty_card, qty_upi FROM sales WHERE products_id = $1 AND shops_id = $2 and sales_date=$3`,
              [data[j].products_id, shops_id, Date()]
            );
            if (activeQty.rowCount) {
              const newQty = activeQty.rows[0].stock - data[j].qty;
              const updatestock = await pool.query(
                `UPDATE stock set stock = $1 WHERE products_id = $2 AND shops_id = $3`,
                [newQty, data[j].products_id, shops_id]
              );
            } else {
              const addActive = await pool.query(
                `INSERT INTO stock( shops_id, products_id, stock )
                VALUES ( $1, $2, $3 )`,
                [shops_id, data[j].products_id, data[j].qty]
              );
            }

            //
            if (salesQty.rowCount) {
              const newQty = salesQty.rows[0].qty + data[j].qty;
              if (transaction_type == "Cash") {
                const newCashQty = salesQty.rows[0].qty_cash + data[j].qty;
                const updateSales = await pool.query(
                  `UPDATE sales set qty = $1 and qty_cash=$2 WHERE products_id = $3 AND shops_id = $4`,
                  [newQty, newCashQty, data[j].products_id, shops_id, Date()]
                );
              } else if (transaction_type == "Card") {
                const newCardQty = salesQty.rows[0].qty_card + data[j].qty;
                const updateSales = await pool.query(
                  `UPDATE sales set qty = $1 and qty_card=$2 WHERE products_id = $3 AND shops_id = $4`,
                  [newQty, newCardQty, data[j].products_id, shops_id, Date()]);
              } else if (transaction_type == "UPI") {
                const newUPIQty = salesQty.rows[0].qty_upi + data[j].qty;
                const updateSales = await pool.query(
                  `UPDATE sales set qty = $1 and qty_upi = $2WHERE products_id = $3 AND shops_id = $4`,
                  [newQty, newUPIQty, data[j].products_id, shops_id, Date()]);
              }

            } else {
              const addSales = await pool.query(
                `INSERT INTO stock( sales_date, shops_id, products_id, qty, price, qty_cash, qty_card, qty_upi)
            VALUES ( $1, $2, $3 )`,
                [shops_id, data[j].products_id, data[j].qty]
              );
            }
            console.log("10");
            await pool.query("COMMIT");
          }
        }
      }
    } catch (err) {
      console.log(err);
      errLog.push({ shops_id });
      return;
    }
  }
  return res.status(200).send({
    save: saveLog,
    err: errLog,
  });
}); /*
      //begin transaction
      await pool.query('BEGIN');
      //sales insert
      for (i = 0; i < products_ids.length; i++) {
        const products_id = products_ids[i];
        const qty = qtys[i];
        // const price_sold = total_sub[i];  fetch price to use and its value
        // check item exists

        const priceList = await pool.query(
          `select * from shops where id=$1`,
          [shops_id]
        );
        const price = priceList.rows[0].price_to_use;
        const check_stock = await pool.query(
          `SELECT s.stock, p.${price} as price FROM stock s inter join products p on p.id=s.products_id
        WHERE products_id = $1
        AND shops_id = $2`,
          [products_id, shops_id]
        );
        if (check_stock.rows[0].stock < qty) {
          doesNotExistLog.push({ products_id });
          continue;
        }
        // insert sales item
        console.log("3");
        const sals_saved = await pool.query(
          `INSERT INTO sales( sales_date, shops_id, products_id, qty, price, qty_cash, qty_card, qty_upi ) 
        VALUES ( $1, $2, $3, $4, $5, $6, $7 ) RETURNING id`,
          [sale_date, shops_id, products_id, check_stock.rows[0].price, qty, qty_cash, qty_card, qty_upi]
        );
        if (sals_saved.rowCount) {
          console.log("5");
          saveLog.push({ products_id });
          const newQty = check_stock.rows[0].stock - qty;
          const updateActive = await pool.query(
            `UPDATE stock set stock = $1 WHERE products_id = $2 AND shops_id = $3`,
            [newQty, products_id, shops_id]
          );
        }
        console.log("4");
      }
      await pool.query('COMMIT');
      console.log("10");
    } catch (err) {
      console.log(err);
      console.log("11");
      await pool.query('ROLLBACK');
      errLog.push({ products_id });
      return;
    }
    console.log("12");
    return res.status(200).send({
      exist: existLog,
      save: saveLog,
      err: errLog,
    });
  }
  return res.status(400).send("no data provided");
});
/*
//console.log(data);
if (data && data.length > 0) {
for (i = 0; i < data.length; i++) {
  const { shops_id, purchase_date, products_id, qty, total_price } = data[i];
  console.log("1 dta: ", data[i]);
  console.log("2");
  if (check_stock.rows[0].stock < qty) {
    existLog.push({ products_id });
    continue;
  }
  // insert sales item
  console.log("3");
  const saved = await pool.query(
    `INSERT INTO sales( sales_date, shops_id, products_id, price, qty_cash, qty_card, qty_upi ) 
        VALUES ( $1, $2, $3, $4, $5, $6, $7 ) 
        RETURNING products_id`,
    [purchase_date, shops_id, products_id, total_price, qty_case, qty_item,]
  );
  console.log("4");
  if (saved.rowCount) {
    console.log("5");
    saveLog.push({ products_id });
    const qty = (qty_case * itemList.rows[0].per_case) + qty_item;
    const activeQty = await pool.query(
      `SELECT stock FROM stock WHERE products_id = $1 AND shops_id = $2`,
      [products_id, shops_id]
    );
    console.log("6 qty: " + qty);
    if (activeQty.rowCount) {
      const newQty = activeQty.rows[0].stock + qty;
      const updateActive = await pool.query(
        `UPDATE stock set stock = $1 WHERE products_id = $2 AND shops_id = $3`,
        [newQty, products_id, shops_id]
      );
      console.log("7 newQty: " + newQty);
      continue;
    }
    console.log("8");
    const addActive = await pool.query(
      `INSERT INTO stock( shops_id, products_id, stock )
          VALUES ( $1, $2, $3 )`,
      [shops_id, products_id, qty]
    );
    console.log("9");
  }
  await pool.query('COMMIT');
  console.log("10");
} catch (err) {
  console.log(err);
  console.log("11");
  await pool.query('ROLLBACK');
  errLog.push({ products_id });
  return;
}
}
console.log("12");
return res.status(200).send({
exist: existLog,
save: saveLog,
err: errLog,
});}
return res.status(400).send("no data provided");
});*/

module.exports = router;
