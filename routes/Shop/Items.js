const router = require("express").Router();
const pool = require("../../db");
const splitInvoice = require("../../utils/splitInvoice");
const toISOLocal = require("../../utils/toIsoLocal");

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

// insert products
router.post("/items", async (req, res) => {
  const data = req.body;
  if (data && data.length > 0) {
    for (i = 0; i < data.length; i++) {
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
      } = data[i];
      try {
        // begin transaction
        const itemList = await pool.query(
          `insert into products( name, brands_id, categories_id, sizes_id, barcode, per_case, purchase_price, case_price, mrp, discount, mrp1, mrp2, mrp3, mrp4 )
          VALUES( $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14 )`,
          [
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
          ]
        );
        if (itemList.rowCount)
          return res.status(404).send("No Items found in Shop");

        return res.status(200).send(itemList.rows);
      } catch (error) {
        console.log(error);
        return res.status(500).send("Internal server error");
      }
    }
  }
});

// stock
router.post("/stock", async (req, res) => {
  const data = req.body;
  let saveLog = [];
  let errLog = [];
  if (data && data.length > 0) {
    // begin transaction
    for (i = 0; i < data.length; i++) {
      const { shops_id, product, stock } = data[i];
      try {
        await pool.query("BEGIN");
        const productId = await pool.query(
          `select id, purchase_price from products where name=$1`,
          [product]
        );
        const itemList = await pool.query(
          `insert into stock( shops_id, products_id, stock )
          VALUES( $1, $2, $3 ) RETURNING id`,
          [shops_id, productId.rows[0]?.id, stock]
        );
        const productList = await pool.query(
          `INSERT INTO purchase( products_id, shops_id, price, qty_item, qty_case)        
          VALUES ( $1, $2, $3, $4, $5) RETURNING id`,
          [
            productId.rows[0]?.id,
            shops_id,
            productId.rows[0]?.purchase_price,
            stock,
            0,
          ]
        );
        if (itemList.rowCount) {
          saveLog.push({ itemList });
          pool.query("COMMIT");
        }
      } catch (error) {
        console.log(`${product} mismatch ------------`);
        console.log(error);
        pool.query("ROLLBACK");
        errLog.push({ product });
      }
    }
    return res.status(200).send({ saveLog, errLog });
  }
});

//sold today
router.get("/temp-sold", async (req, res) => {
  const data = req.query;
  try {
    const { shops_id, sales_date } = req.query;
    const itemList = await pool.query(
      `select * from sales where shops_id=$1 and sales_date=$2`,
      [shops_id, sales_date]
    );
    if (itemList.rowCount === 0)
      return res.status(404).send("No Items found in Shop");

    return res.status(200).send(itemList.rows);
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal server error");
  }
});

// specific products rout
router.get("/product/:id", async (req, res) => {
  console.log(req.params);
  const { id } = req.params;
  try {
    const itemList = await pool.query(`select * from products where id=$1`, [
      id,
    ]);
    if (itemList.rowCount === 1) return res.status(200).send(itemList.rows);
    return res.status(404).send("No Items found in Shop");
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal server error");
  }
});

// products rout
router.get("/products", async (req, res) => {
  const { shops_id } = req.query;
  try {
    const itemList = await pool.query(`select * from products`);
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
          VALUES ( $1, $2, $3, $4, $5, $6 ) RETURNING products_id`,
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
          const qty = parseInt(qty_case * itemList.rows[0].case_qty + qty_item);
          const activeQty = await pool.query(
            `SELECT stock FROM stock WHERE products_id = $1 AND shops_id = $2`,
            [products_id, shops_id]
          );
          if (activeQty.rowCount) {
            console.log("6");
            const newQty = activeQty.rows[0].stock + qty;
            const updateActive = await pool.query(
              `UPDATE stock set stock = $1 WHERE products_id = $2 AND shops_id = $3`,
              [newQty, products_id, shops_id]
            );
          } else {
            console.log("7  \n", shops_id, products_id, qty);
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

// sales route
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

  const fdata = req.body;
  // console.log(req.body);
  let saveLog = [];
  let errLog = [];
  let sales_no = "";
  let qty_cash = 0,
    qty_card = 0,
    qty_upi = 0;
  // console.log(data.length);
  const { shops_id, users_id, transaction_type, items, sDate } = fdata;
  const date = new Date(sDate || new Date());
  // console.log(items);
  console.log("\n\n\n1 items:\n ", items);
  if (fdata && items.length > 0) {
    try {
      for (i = 0; i < items.length; i++) {
        const { products_id, qty, price, discount } = items[i];
        const itemList = await pool.query(
          `SELECT stock FROM stock WHERE products_id = $1 and shops_id = $2`,
          [products_id, shops_id]
        );
        if (itemList.rows[0].stock < qty) {
          errLog.push({ products_id });
          return res.status(404).send("Not enough stock");
        }
      }
    } catch (err) {
      console.log(err);
      return res
        .status(100)
        .send("No data was retrieved, updated, or deleted.");
    }
    try {
      //begin transaction
      await pool.query("BEGIN");
      const sales_count = await pool.query(
        `SELECT COUNT( DISTINCT sales_no) AS count FROM invoices
        WHERE shops_id = $1 and
        inserted_at = $2`,
        [shops_id, date]
      );
      const tx =
        transaction_type === "Cash"
          ? "csh"
          : transaction_type === "UPI"
            ? "upi"
            : "crd";
      sales_no = `${date.getFullYear()}${parseInt(date.getMonth()) + 1
        }${date.getDate()}${parseInt(sales_count.rows[0].count) + 1}${tx}`;

      const brokenData = await splitInvoice(items);
      // console.log("\n\nbroken data : \n\n", brokenData);
      // console.log("\n\nbroken data length : \n\n", brokenData.length);
      console.log("2");
      for (i = 0; i < brokenData.length; i++) {
        const data = brokenData[i];
        // console.log(`\n\nbroken loop ${i} : \n`, brokenData[i]);
        const invoiceList = await pool.query(
          `SELECT * FROM invoices
          WHERE shops_id = $1 and
          invoice_date = $2`,
          [shops_id, date]
        );
        const lastInv = invoiceList.rows[
          invoiceList.rowCount - 1
        ]?.invoice_number.split("-") || [0];
        const consecutive = parseInt(lastInv[lastInv.length - 1]) + 1;
        for (j = 0; j < data.length; j++) {
          // invoice ID in formate yyyy-mm-dd-shop-invoice_no
          const invoice_number = `${toISOLocal(date).slice(
            0,
            10
          )}-${shops_id}-${consecutive}`;
          console.log(`\n\t3 broken Data ${j} : \n\t`, data[j]);
          console.log(
            `\nsales_no: ${sales_no},\ninvoice_number: ${invoice_number},\nshops_id: ${shops_id},\nusers_id: ${users_id},\nproducts_id: ${data[j].products_id},\nqty: ${data[j].qty},\nprice: ${data[j].price},\ntotal: ${data[j].total},\ntransaction_type: ${transaction_type}\n\n`
          );
          if (data[j].qty <= 0) {
            continue;
          }
          data[j].total =
            parseInt(data[j].qty) *
            (parseFloat(data[j].price) - parseFloat(data[j].discount));
          // saveLog.push(data[j].products_id);
          const invoiceSaved = await pool.query(
            `INSERT INTO invoices( sales_no, invoice_number, shops_id, users_id, products_id, qty, price, 
              discount, total, transaction_type, invoice_date )
            VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11 )
            RETURNING sales_no`,
            [
              sales_no,
              invoice_number,
              shops_id,
              users_id,
              data[j].products_id,
              data[j].qty,
              data[j].price,
              data[j].discount,
              data[j].total,
              transaction_type,
              date,
            ]
          );
          if (invoiceSaved.rowCount) {
            console.log("5 ");
            saveLog.push(data[j].products_id);
            const activeQty = await pool.query(
              `SELECT stock FROM stock WHERE products_id = $1 AND shops_id = $2`,
              [data[j].products_id, shops_id]
            );
            console.log("6 ");
            if (activeQty.rowCount) {
              const newQty = activeQty.rows[0].stock - data[j].qty;
              const updatestock = await pool.query(
                `UPDATE stock set stock = $1 WHERE products_id = $2 AND shops_id = $3`,
                [newQty, data[j].products_id, shops_id]
              );
              console.log("7 newStockQty: ", newQty);
            }
            console.log("9 ");
            const salesQty = await pool.query(
              `SELECT qty, qty_cash, qty_card, qty_upi FROM sales WHERE products_id = $1 AND shops_id = $2 and sales_date= $3`,
              [data[j].products_id, shops_id, date]
            );
            if (salesQty.rowCount) {
              const newQty = salesQty.rows[0].qty + data[j].qty;
              console.log("10 newQty: ", newQty);
              if (transaction_type == "Cash") {
                const newCashQty = parseInt(
                  salesQty.rows[0].qty_cash + data[j].qty
                );
                console.log("15 newCashQty: ", newCashQty);
                const updateSales = await pool.query(
                  `UPDATE sales set qty = $1, qty_cash=$2 WHERE products_id = $3 AND shops_id = $4 AND sales_date=$5`,
                  [newQty, newCashQty, data[j].products_id, shops_id, date]
                );
              } else if (transaction_type == "Card") {
                console.log("11 ");
                const newCardQty = parseInt(
                  salesQty.rows[0].qty_card + data[j].qty
                );
                const updateSales = await pool.query(
                  `UPDATE sales set qty = $1, qty_card=$2 WHERE products_id = $3 AND shops_id = $4 AND sales_date=$5`,
                  [newQty, newCardQty, data[j].products_id, shops_id, date]
                );
              } else if (transaction_type == "UPI") {
                const newUPIQty = parseInt(
                  salesQty.rows[0].qty_upi + data[j].qty
                );
                const updateSales = await pool.query(
                  `UPDATE sales set qty = $1, qty_upi = $2 WHERE products_id = $3 AND shops_id = $4 AND sales_date=$5`,
                  [newQty, newUPIQty, data[j].products_id, shops_id, date]
                );
              }
            } else {
              console.log("12 ");
              if (transaction_type == "Cash") {
                qty_cash = data[j].qty;
              } else if (transaction_type == "Card") {
                qty_card = data[j].qty;
              } else if (transaction_type == "UPI") {
                qty_upi = data[j].qty;
              }
              const addSales = await pool.query(
                `INSERT INTO sales( sales_date, shops_id, products_id, qty, price, qty_cash, qty_card, qty_upi)
            VALUES ( $1, $2, $3, $4, $5, $6, $7, $8 )`,
                [
                  date,
                  shops_id,
                  data[j].products_id,
                  data[j].qty,
                  data[j].price,
                  qty_cash,
                  qty_card,
                  qty_upi,
                ]
              );
            }
            console.log("13");
          }
          console.log("14");
        }
        console.log("15");
        await pool.query("COMMIT");
      }
    } catch (err) {
      console.log("16");
      console.log(err);
      await pool.query("ROLLBACK");
      errLog.push({ shops_id });
      return;
    }
  }
  return res.status(200).send({
    save: saveLog,
    err: errLog,
    sales_no: sales_no,
  });
});

// blk sales route
router.post("/blkSales", async (req, res) => {
  //   data featched:{
  //     "date": "2020-04-01",
  //     "shops_id":1,
  //     "users_id":1,
  //     "items":[
  //         {
  //             "products_id":1,
  //             "price":1000,
  //             "qty_cash":3,
  //             "qty_card":6,
  //             "qty_upi":9,
  //         },
  //         {
  //             "products_id":2,
  //             "qty":8,
  //             "price":980,
  //             "qty_cash":18,
  //             "qty_card":32,
  //             "qty_upi":55,
  //         },
  //     ]
  // }

  const { shops_id, users_id, items, sales_date } = req.body;
  let saveLog = [];
  let errLog = [];
  let sales_no = "";
  const date = new Date(sales_date);
  if (req.body && items.length > 0) {
    try {
      console.log("1 ");
      await pool.query("BEGIN");
      const sales_count = await pool.query(
        `SELECT COUNT( DISTINCT sales_no) AS count FROM invoices
        WHERE shops_id = $1 and
        inserted_at = $2`,
        [shops_id, date]
      );
      console.log(sales_date);
      const tx =
        transaction_type === "Cash"
          ? "csh"
          : transaction_type === "UPI"
            ? "upi"
            : "crd";
      sales_no = `${date.getFullYear()}${parseInt(date.getMonth()) + 1
        }${date.getDate()}${parseInt(sales_count.rows[0].count) + 1}${tx}`;
      console.log("9 sales_no: ", sales_count.rows[0]);
      for (let i = 0; i < items.length; i++) {
        const { products_id, price, qty_cash, qty_card, qty_upi } = items[i];
        console.log(items[i]);
        let qty = parseInt(qty_cash + qty_card + qty_upi);

        const itemList = await pool.query(
          `SELECT stock FROM stock WHERE products_id = $1 and shops_id = $2`,
          [products_id, shops_id]
        );
        console.log("2 itemList: ", itemList.rows[0]);
        console.log(qty);
        if (itemList.rowCount && qty < itemList.rows[0].stock) {
          try {
            let brokenData = [];
            if (qty_cash > 0) {
              cash_item = [
                { products_id, price, qty: qty_cash, transaction_type: "Cash" },
              ];
              console.log("\n\n\n2 cash_item:\n ", cash_item);
              cash_Data = await splitInvoice(cash_item);
              console.log("\n\n\n3 cash_Data:\n ", cash_Data);
              brokenData = [...brokenData, ...cash_Data];
            }
            if (qty_card > 0) {
              card_item = [
                { products_id, price, qty: qty_card, transaction_type: "Card" },
              ];
              // console.log("\n\n\n4 card_item:\n ", card_item);
              card_Data = await splitInvoice(card_item);
              // console.log("\n\n\n5 card_Data:\n ", card_Data);
              brokenData = [...brokenData, ...card_Data];
            }
            if (qty_upi > 0) {
              upi_item = [
                { products_id, price, qty: qty_upi, transaction_type: "UPI" },
              ];
              // console.log("\n\n\n6 upi_item:\n ", upi_item);
              upi_Data = await splitInvoice(upi_item);
              // console.log("\n\n\n7 upi_Data:\n ", upi_Data);
              brokenData = [...brokenData, ...upi_Data];
            }
            console.log("\n\n\n8 brokenData:\n", brokenData);
            let i = 0;
            while (i < brokenData.length) {
              // console.log(`10 ${i}brokenData: `, brokenData[i]);
              const data = brokenData[i];
              // console.log(`\n\nbroken loop ${i} : \n`, brokenData[i]);
              const invoiceList = await pool.query(
                `SELECT COUNT( DISTINCT invoice_number) AS count FROM invoices
                WHERE shops_id = $1 and invoice_date = $2`,
                [shops_id, date]
              );

              const lastInv = invoiceList.rows[
                invoiceList.rowCount - 1
              ]?.invoice_number.split("-") || [0];
              const consecutive = parseInt(lastInv[lastInv.length - 1]) + 1;
              // invoice ID in formate yyyy-mm-dd-shop-invoice_no
              const invoice_number = `${toISOLocal(new Date(sales_date)).slice(
                0,
                10
              )}-${shops_id}-${consecutive}`;
              // console.log("11 invoice_number: ", invoice_number);
              for (j = 0; j < data.length; j++) {
                console.log(`\n\n12 broken Data ${j} : \n`, data[j]);
                console.log(
                  `\nsales_no: ${sales_no},\ninvoice_number: ${invoice_number},\nshops_id: ${shops_id},\nusers_id: ${users_id},\nproducts_id: ${data[j].products_id},\nqty: ${data[j].qty},\nprice: ${data[j].price},\ntotal: ${data[j].total},\ntransaction_type: ${data[j].transaction_type}\n\n`
                );
                // saveLog.push(data[j].products_id);
                const invoiceSaved = await pool.query(
                  `INSERT INTO invoices( sales_no, invoice_date, invoice_number, 
                    shops_id, users_id, products_id, qty, price, discount, total, transaction_type)
                  VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                  RETURNING sales_no`,
                  [
                    sales_no,
                    date,
                    invoice_number,
                    shops_id,
                    users_id,
                    data[j].products_id,
                    data[j].qty,
                    data[j].price,
                    0,
                    data[j].total,
                    data[j].transaction_type,
                  ]
                );
                if (invoiceSaved.rowCount) {
                  console.log("11 ");
                  saveLog.push(data[j].products_id);
                  const activeQty = await pool.query(
                    `SELECT stock FROM stock WHERE products_id = $1 AND shops_id = $2`,
                    [data[j].products_id, shops_id]
                  );
                  console.log("12 ");
                  if (activeQty.rowCount) {
                    const newQty = activeQty.rows[0].stock - data[j].qty;
                    const updatestock = await pool.query(
                      `UPDATE stock set stock = $1 WHERE products_id = $2 AND shops_id = $3`,
                      [newQty, data[j].products_id, shops_id]
                    );
                    console.log("13 newStockQty: ", newQty);
                  }
                  console.log("14 ");
                  const salesQty = await pool.query(
                    `SELECT qty, qty_cash, qty_card, qty_upi FROM sales 
                    WHERE products_id = $1 AND shops_id = $2 and sales_date=$3`,
                    [data[j].products_id, shops_id, date]
                  );
                  console.log("-----15 ", salesQty.rowCount);
                  if (salesQty.rowCount) {
                    const newQty = salesQty.rows[0].qty + data[j].qty;
                    console.log("15 newQty: ", newQty);
                    if (data[j].transaction_type == "Cash") {
                      const newCashQty = parseInt(
                        salesQty.rows[0].qty_cash + data[j].qty
                      );
                      console.log("16 newCashQty: ", newCashQty);
                      const updateSales = await pool.query(
                        `UPDATE sales set qty = $1, qty_cash=$2 WHERE products_id = $3 
                        AND shops_id = $4 AND sales_date=$5`,
                        [
                          newQty,
                          newCashQty,
                          data[j].products_id,
                          shops_id,
                          date,
                        ]
                      );
                    } else if (data[j].transaction_type == "Card") {
                      const newCardQty = parseInt(
                        salesQty.rows[0].qty_card + data[j].qty
                      );
                      console.log("17 newCardQty: ", newCardQty);
                      const updateSales = await pool.query(
                        `UPDATE sales set qty = $1, qty_card=$2 WHERE products_id = $3 
                        AND shops_id = $4 AND sales_date=$5`,
                        [
                          newQty,
                          newCardQty,
                          data[j].products_id,
                          shops_id,
                          date,
                        ]
                      );
                    } else if (data[j].transaction_type == "UPI") {
                      const newUPIQty = parseInt(
                        salesQty.rows[0].qty_upi + data[j].qty
                      );
                      console.log("18 newUPIQty: ", newUPIQty);
                      const updateSales = await pool.query(
                        `UPDATE sales set qty = $1, qty_upi = $2 WHERE products_id = $3 AND shops_id = $4 
                        AND sales_date=$5`,
                        [newQty, newUPIQty, data[j].products_id, shops_id, date]
                      );
                    }
                  } else {
                    console.log("19 ");
                    let cash_data = 0;
                    let card_data = 0;
                    let upi_data = 0;
                    if (data[j].transaction_type == "Cash") {
                      cash_data = data[j].qty;
                    } else if (data[j].transaction_type == "Card") {
                      card_data = data[j].qty;
                    } else if (data[j].transaction_type == "UPI") {
                      upi_data = data[j].qty;
                    }
                    const addSales = await pool.query(
                      `INSERT INTO sales( sales_date, shops_id, products_id, qty, price, 
                        qty_cash, qty_card, qty_upi)
                      VALUES ( $1, $2, $3, $4, $5, $6, $7, $8 )`,
                      [
                        date,
                        shops_id,
                        data[j].products_id,
                        data[j].qty,
                        data[j].price,
                        cash_data,
                        card_data,
                        upi_data,
                      ]
                    );
                  }
                  console.log("20 ");
                }
                console.log("21 ");
              }
              i++;
            }
          } catch (err) {
            console.log("12 err: ", err);
            await pool.query("ROLLBACK");
            errLog.push({ shops_id });
            return;
          }
          console.log("13 ");
        } else {
          console.log("14 err");
          await pool.query("ROLLBACK");
          errLog.push({ shops_id, products_id });
          return res.status(100).send({
            err: errLog,
          });
        }
        console.log("14 if");
      }
      await pool.query("COMMIT");
      console.log("15 ");
    } catch (err) {
      console.log("16 err: ", err);
      return res
        .status(100)
        .send("No data was retrieved, updated, or deleted.");
    }
    console.log("17 ");
    return res.status(200).send({
      save: saveLog,
      err: errLog,
      sales_no: sales_no,
    });
  }
  return res.status(200).send({ errLog: errLog });
});

// @route   GET shop/todays-purchase?shops_id=$1
router.post("/todays-purchase", async (req, res) => {
  const { shops_id, date } = req.body;
  try {
    if (date.length) {
      const purchase = await pool.query(
        `SELECT pd.name, p.price, p.qty_case, p.qty_item
         FROM purchase p
         left join products pd on pd.id = p.products_id
         WHERE p.shops_id = $1 and p.purchase_date = $2`,
        [shops_id, date]
      );
      if (purchase.rowCount) {
        return res.status(200).send({
          purchase: purchase.rows,
        });
      } else {
        return res.status(404).send({
          purchase: [],
        });
      }
    }
  } catch (err) {
    console.log("err: ", err);
    return res.status(100).send({
      purchase: "No purchase found",
    });
  }
});

// @route   GET shop/todays-sales
router.post("/todays-sales", async (req, res) => {
  const { shops_id, date } = req.body;
  try {
    if (date.length) {
      const sales = await pool.query(
        `SELECT pd.name, s.qty, s.price, s.qty_cash, s.qty_card, s.qty_upi
         FROM sales s
         left join products pd on pd.id = s.products_id
         WHERE s.shops_id = $1 and s.sales_date = $2`,
        [shops_id, date]
      );
      if (sales.rowCount) {
        return res.status(200).send({
          sales: sales.rows,
        });
      } else {
        return res.status(404).send({
          sales: [],
        });
      }
    }
  } catch (err) {
    console.log("err: ", err);
    return res.status(500).send({
      sales: "No sales found",
    });
  }
});

// @route   GET shop/todays-purchase?shops_id=$1
router.post("/purchase-report", async (req, res) => {
  const { shops_id, sDate, eDate } = req.body;
  try {
    if (sDate.length && eDate.length) {
      const purchase = await pool.query(
        `SELECT pd.name, p.price, p.qty_case, p.qty_item
         FROM purchase p
         left join products pd on pd.id = p.products_id
         WHERE p.shops_id = $1 and p.purchase_date between $2 and $3`,
        [shops_id, sDate, eDate]
      );
      if (purchase.rowCount) {
        return res.status(200).send({
          purchase: purchase.rows,
        });
      } else {
        return res.status(404).send({
          purchase: [],
        });
      }
    }
  } catch (err) {
    console.log("err: ", err);
    return res.status(100).send({
      purchase: "No purchase found",
    });
  }
});

// @route   GET shop/todays-sales
router.post("/sales-report", async (req, res) => {
  const { shops_id, sDate, eDate } = req.body;
  try {
    if (sDate.length && eDate.length) {
      const sales = await pool.query(
        `SELECT pd.name, s.qty, s.price, s.qty_cash, s.qty_card, s.qty_upi
         FROM sales s
         left join products pd on pd.id = s.products_id
         WHERE s.shops_id = $1 and s.sales_date between $2 and $3`,
        [shops_id, sDate, eDate]
      );
      if (sales.rowCount) {
        return res.status(200).send({
          sales: sales.rows,
        });
      } else {
        return res.status(404).send({
          sales: [],
        });
      }
    }
  } catch (err) {
    console.log("err: ", err);
    return res.status(500).send({
      sales: "No sales found",
    });
  }
});

// @route   POST shop/invoices
router.post("/invoice", async (req, res) => {
  const { sales_no } = req.query;
  const { shops_id } = req.body;
  try {
    const invoices = await pool.query(
      `SELECT i.sales_no, i.invoice_date, i.invoice_number,
      p.name, i.qty, i.price, i.total
      FROM invoices i
      left join products p on p.id=i.products_id
      WHERE i.shops_id = $1 AND i.sales_no = $2`,
      [shops_id, sales_no]
    );
    if (invoices.rowCount) {
      return res.status(200).send({
        invoices: invoices.rows,
      });
    } else {
      return res.status(404).send({
        invoices: [],
      });
    }
  } catch (err) {
    console.log("err: ", err);
    return res.status(500).send({
      invoices: "No invoices found",
    });
  }
});

// @route   POST shop/invoices
router.post("/invoices", async (req, res) => {
  const { shops_id, sDate, eDate } = req.body;
  try {
    const invoices = await pool.query(
      `SELECT i.sales_no, i.invoice_date, i.invoice_number,
      p.name, i.qty, i.price, i.total, i.discount, i.transaction_type
      FROM invoices i
      left join products p on p.id=i.products_id
      WHERE shops_id = $1 and i.invoice_date between $2 and $3
      ORDER BY i.invoice_date DESC, i.invoice_number DESC`,
      [shops_id, sDate, eDate]
    );
    if (invoices.rowCount) {
      return res.status(200).send({
        invoices: [...invoices.rows],
      });
    } else {
      return res.status(404).send({
        invoices: [],
      });
    }
  } catch (err) {
    console.log("err: ", err);
    return res.status(500).send({
      invoices: "No invoices found",
    });
  }
});

// @route   POST shop/invoices/:id
router.post("/product/invoices", async (req, res) => {
  // {
  //   "id":298,
  //   "shops_id":1,
  //   "sDate":"2021-06-01",
  //   "eDate":"{{today}}"
  // }
  const { id, shops_id, sDate, eDate } = req.body;
  try {
    const sales = await pool.query(
      `SELECT p.name, s.sales_date, s.qty
      FROM sales s
      left join products p on p.id=s.products_id
      WHERE s.shops_id = $1 and p.id = $2 and
      s.sales_date between $3 and $4`,
      [shops_id, id, sDate, eDate]
    );
    const purchase = await pool.query(
      `SELECT pd.name, p.purchase_date, p.qty_case * pd.case_qty +  p.qty_item as qty
      FROM purchase p
      left join products pd on pd.id = p.products_id
      WHERE p.shops_id = $1 and p.products_id = $2 and
      p.purchase_date between $3 and $4`,
      [shops_id, id, sDate, eDate]
    );
    if (sales.rowCount || purchase.rowCount) {
      return res.status(200).send({
        sales: sales.rows,
        purchase: purchase.rows,
      });
    } else {
      return res.status(404).send({
        sales: [],
        purchase: [],
      });
    }
  } catch (err) {
    console.log("err: ", err);
    return res.status(500).send({
      invoices: "No invoices found",
    });
  }
});

// @route   POST shop/invoices/by-brand
router.post("/invoices/by-brand", async (req, res) => {
  const { shops_id, brands_id, sDate, eDate } = req.body;
  try {
    const invoices = await pool.query(
      `SELECT b.name, p.name, s.sales_date, s.qty, s.price
      FROM sales s
      left join products p on s.products_id = p.id
      left join brands b on p.brands_id = b.id
      WHERE shops_id=$1 AND b.id=$2 AND s.sales_date between $3 and $4`,
      [shops_id, brands_id, sDate, eDate]
    );
    if (invoices.rowCount) {
      return res.status(200).send({
        invoices: invoices.rows,
      });
    } else {
      return res.status(404).send({
        invoices: [],
      });
    }
  } catch (err) {
    console.log("err: ", err);
    return res.status(500).send({
      invoices: "No invoices found",
    });
  }
});

// @route   POST shop/stock-opening
router.post("/stock-opening", async (req, res) => {
  // {
  //   "shops_id":2,
  //   "products_id":141,
  //   "eDate":"{{date}}"
  // }
  const { shops_id, products_id, eDate } = req.body;
  try {
    const totalPurchase = await pool.query(
      `SELECT sum(p.qty_case * pd.case_qty +  p.qty_item) as total
      FROM purchase p
      left join products pd on pd.id = p.products_id
      WHERE p.shops_id = $1 and p.products_id = $2 and
      p.purchase_date < $3`,
      [shops_id, products_id, eDate]
    );
    const totalSales = await pool.query(
      `SELECT sum(s.qty) as total
      FROM sales s
      WHERE s.shops_id = $1 and s.products_id = $2 and
      s.sales_date < $3`,
      [shops_id, products_id, eDate]
    );
    const openingStock = totalPurchase.rows[0].total - totalSales.rows[0].total;
    return res.status(200).send({
      totalPurchase: totalPurchase.rows[0].total,
      totalSales: totalSales.rows[0].total,
      openingStock,
    });
  } catch (err) {
    console.log("err: ", err);
    return res.status(500).send({
      invoices: "No invoices found",
    });
  }
});

// @route   POST shop/all-stock-opening
router.post("/all-stock-opening", async (req, res) => {
  // {
  //   "shops_id":2,
  //   "eDate":"{{date}}"
  // }
  const { shops_id, eDate } = req.body;
  try {
    const totalPurchase = await pool.query(
      `SELECT p.products_id as id, pd.name, sum(p.qty_case * pd.case_qty + p.qty_item) as total
      FROM purchase p
      left join products pd on pd.id = p.products_id
      WHERE p.shops_id = $1 and p.purchase_date < $2
      group by p.products_id, pd.name`,
      [shops_id, eDate]
    );
    const totalSales = await pool.query(
      `SELECT p.id, p.name, sum(s.qty) as total
      FROM sales s
      left join products p on p.id = s.products_id
      WHERE s.shops_id = $1 and s.sales_date < $2
      group by p.id, p.name`,
      [shops_id, eDate]
    );
    const openingStock = totalPurchase.rows.map((purchase) => {
      const sales = totalSales.rows.find((sale) => sale.id === purchase.id);
      return {
        id: purchase.id,
        name: purchase.name,
        totalPurchase: purchase.total,
        totalSales: sales ? sales.total : 0,
        openingStock: purchase.total - (sales ? sales.total : 0),
      };
    });
    return res.status(200).send({
      openingStock,
    });
  } catch (err) {
    console.log("err: ", err);
    return res.status(500).send({
      invoices: "No invoices found",
    });
  }
});

module.exports = router;
