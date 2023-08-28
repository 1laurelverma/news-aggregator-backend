const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const bodyParser = require("body-parser");
const tokenAuth = require("./auth/auth");
const UserModel = require("./models/user");
const cors = require("cors");
const routes = require("./routes/routes");
const secureRoute = require("./routes/secure-routes");
const path = require("path");
const app = express();
const redis = require("redis");
require("dotenv").config();

// const client = redis.createClient();

const port = 8000;
const corsOptions = {
  credentials: true,
  origin: "*",
};

mongoose
  .connect(
    "mongodb+srv://1laurelverma:Laurelverma@123@cluster0.rbam4e6.mongodb.net/?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("DB connected..."));
mongoose.set("useCreateIndex", true);
mongoose.connection.on("error", (error) => console.log(error));
mongoose.Promise = global.Promise;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(require("./morgan/morgan"));
app.use("/api-docs", require("./api-docs/Swagger"));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(cors(corsOptions));
app.use("/", routes);
app.use("/files", express.static(path.join(__dirname, "./Images")));

// Handle errors.
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({ error: err });
});

// console.log(process.env.PORT);
app.listen(process.env.PORT || port, () => {
  console.log("Server started.");
});
