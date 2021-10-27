require("dotenv").config();

const express = require("express");
const app = express();
const PORT = process.env.PORT || 5000;
const cors = require("cors");
const cookieParser = require("cookie-parser");

app.use(express.json({ limit: "50mb" }));
app.use(
  cors({
    origin: ["http://localhost:3000", "http://pos.liquortown.in"],
    credentials: true,
  })
);
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).send("Hello");
});

const masterUsersRoutes = require("./routes/Master/Users");
const masterItemsRoutes = require("./routes/Master/Items");
const authRoutes = require("./routes/Auth/");
const shopItemsRoutes = require("./routes/Shop/Items");

app.use("/master/user", masterUsersRoutes);
app.use("/master/items", masterItemsRoutes);
app.use("/shop", shopItemsRoutes);
app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`listening at http://localhost:${PORT}`);
});
