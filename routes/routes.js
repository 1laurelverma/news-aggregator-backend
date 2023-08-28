const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const Editor = require("../models/editor");
const User = require("../models/user");
const Article = require("../models/article");
const multer = require("multer");
const upload = multer({ dest: "./Images" });
const Redis = require("redis");
const Order = require("../models/order");
const Razorpay = require("razorpay");
const dotenv = require("dotenv");
dotenv.config({ path: "./../config.env" });
const news = require("./newss");
require("dotenv").config();

const userAuthCheck = (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.split(" ")[0] === "Bearer") {
    jwt.verify(req.headers.authorization.split(" ")[1], "randomString", (err, decoded) => {
      if (err) {
        res.status(403).send({ success: false, message: "Failed to authenticate user." });
      } else {
        req.user = decoded;
        next();
      }
    });
  } else {
    res.status(403).send({ success: false, message: "No Token Provided." });
  }
};

const editorAuthCheck = (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.split(" ")[0] === "Bearer") {
    jwt.verify(req.headers.authorization.split(" ")[1], "editorString", (err, decoded) => {
      if (err) {
        res.status(403).send({ success: false, message: "Failed to authenticate user." });
      } else {
        req.editor = decoded;
        next();
      }
    });
  } else {
    res.status(403).send({ success: false, message: "No Token Provided." });
  }
};

router.post("/user/signup", async (req, res) => {
  const { email, name, password, categories, image } = req.body;
  try {
    let user = await User.findOne({
      email,
    });
    if (user) {
      return res.status(400).json({
        msg: "User Already Exists",
      });
    }

    user = new User({
      email,
      name,
      password,
      categories,
      image,
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();
    console.log(process.env.EXPIRY_VAR);
    const payload = {
      id: user.id,
    };

    jwt.sign(
      payload,
      "randomString",
      {
        expiresIn: process.env.EXPIRY_VAR,
      },
      (err, token) => {
        if (err) throw err;
        res.status(200).json({
          token,
          user,
        });
      }
    );
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Error in Saving");
  }
});

// router.post("/user/signup", upload.single("image"), async (req, res) => {
//   const { email, name, password, categories } = req.body;
//   const image = req.file.path;
//   console.log(req.file);
//   try {
//     let user = await User.findOne({
//       email,
//     });
//     if (user) {
//       return res.status(400).json({
//         msg: "User Already Exists",
//       });
//     }

//     user = new User({
//       email,
//       name,
//       password,
//       categories,
//       image,
//     });

//     const salt = await bcrypt.genSalt(10);
//     // console.log(password,salt);
//     user.password = await bcrypt.hash(password, salt);
//     // console.log(user.password);

//     await user.save();
//     console.log(user);

//     const payload = {
//       id: user.id,
//     };

//     jwt.sign(
//       payload,
//       "randomString",
//       {
//         expiresIn: 10000,
//       },
//       (err, token) => {
//         if (err) throw err;
//         res.status(200).json({
//           token,
//           user,
//         });
//       }
//     );
//   } catch (err) {
//     console.log(err.message);
//     res.status(500).send("Error in Saving");
//   }
// });

router.post("/user/login", async (req, res, next) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({
      email,
    });
    if (!user)
      return res.status(400).json({
        message: "User Doesn't Exist",
      });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({
        message: "Incorrect Password !",
      });

    const payload = { id: user.id };

    jwt.sign(
      payload,
      "randomString",
      {
        expiresIn: 3600,
      },
      (err, token) => {
        if (err) throw err;
        res.status(200).json({
          token,
        });
      }
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Server Error",
    });
  }
});

router.get("/user", userAuthCheck, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user) {
    res.send(user);
  }
});

router.patch("/user", userAuthCheck, upload.single("picture"), async (req, res) => {
  const user = await User.findById(req.user.id);
  if (req.body.categories) req.body.categories = req.body.categories.split(",");
  if (req.file && req.file.filename) {
    user.image = req.file.filename;
    user.save();
  }
  user.updateOne(req.body, function (err, result) {
    if (err) {
      console.log(err, "err");
    } else {
      res.status(200).send({ message: "User updated Successfully " });
    }
  });
});

router.delete("/user", userAuthCheck, async (req, res) => {
  const user = await User.deleteOne({ _id: req.user.id });
  res.send(user);
});

router.get("/news", async (req, res) => {
  try {
    const client = await Redis.createClient();
    client.on("error", (err) => {
      console.log("REddis error", err);
      return res.status(400).json({ error: err.message });
    });
    await client.connect();
    console.log("connect ");
    const NEWS = await client.get(`news:all`);
    if (NEWS) {
      const resultJSON = JSON.parse(NEWS);
      console.log("redis result", resultJSON);
      return res.json(resultJSON);
    } else {
      console.log("Fetching Data... news");
      var result = await axios.get("https://newsapi.org/v2/top-headlines", {
        params: {
          country: "in",
          apiKey: "8b08468bd2174e088385c41a3930dc08",
          sortBy: "popularity",
        },
      });
      // console.log(result);
      if (result) {
        client.SETEX(
          `news:all`,
          3600,
          JSON.stringify({
            source: "Redis Cache",
            ...result.data,
          })
        );
        return res.json(result.data);
      }
      return res.json("data not found");
    }
  } catch (err) {
    console.log(err.message);
    return res.status(400).json({ error: err.message });
  }
});

router.get("/news/search/:queryName", userAuthCheck, async (req, res) => {
  const queryName = req.params.queryName;
  // console.log("vv",queryName);
  try {
    // var apikey = "b186e59534794e9a9b732580246cf18a"
    var apikey = "4b13a96635744c649cb1e5d769ecedc9";
    const result = await axios.get(
      `https://newsapi.org/v2/everything?qInTitle=${queryName}&apiKey=${apikey}&sortBy=popularity&language=en`
    );

    if (result) {
      // console.log(result.data);
      return res.json(result.data.articles);
    }
    return res.json("not found");
  } catch (err) {
    console.log(err.message);
    return res.status(400).json({ error: err.message });
  }
});

router.get("/news/:category", userAuthCheck, async (req, res) => {
  var category = req.params.category;
  category = category.toLowerCase();

  // console.log("Fetching Data...", category);
  if (category === "general") {
    // const result = news.general;
    return res.json(news.general);
  } else if (category === "entertainment") {
    return res.json(news.entertainment);
  } else if (category === "health") {
    return res.json(news.health);
  } else if (category === "business") {
    return res.json(news.business);
  } else if (category === "technology") {
    return res.json(news.technology);
  } else if (category === "sports") {
    return res.json(news.sports);
  }
});

router.post("/editor/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let editor = await Editor.findOne({
      email,
    });
    if (editor) {
      return res.status(400).json({
        msg: "Editor Already Exists",
      });
    }

    editor = new Editor({
      email,
      name,
      password,
    });

    const salt = await bcrypt.genSalt(10);
    editor.password = await bcrypt.hash(password, salt);

    await editor.save();

    const payload = {
      id: editor.id,
    };

    jwt.sign(
      payload,
      "editorString",
      {
        expiresIn: 10000,
      },
      (err, token) => {
        if (err) throw err;
        res.status(200).json({
          editor,
          token,
        });
      }
    );
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Error in Saving");
  }
});

router.post("/editor/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    let editor = await Editor.findOne({
      email,
    });
    if (!editor)
      return res.status(400).json({
        message: "Editor Doesn't Exist",
      });

    const isMatch = await bcrypt.compare(password, editor.password);
    if (!isMatch)
      return res.status(400).json({
        message: "Incorrect Password !",
      });

    const payload = { id: editor.id };

    jwt.sign(
      payload,
      "editorString",
      {
        expiresIn: 3600,
      },
      (err, token) => {
        if (err) throw err;
        res.status(200).json({
          token,
        });
      }
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Server Error",
    });
  }
});

router.get("/editor", editorAuthCheck, (req, res) => {
  res.send(req.editor);
});

router.get("/editors", userAuthCheck, async (req, res) => {
  const editors = await Editor.find();
  res.status(200).json({ editors });
});

router.delete("/editor", editorAuthCheck, async (req, res) => {
  const editor = await Editor.deleteOne({ _id: req.editor.id });
  res.send(editor);
});

router.get("/articles", editorAuthCheck, async (req, res) => {
  try {
    const articles = await Article.find();
    res.status(200).json({ articles });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

router.post("/article", editorAuthCheck, async (req, res) => {
  const { title, content } = req.body;

  try {
    const article = await Article.create({
      title,
      content,
      author: req.editor.id,
    });

    res.status(201).json({ message: "Article created successfully", article });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/article/:id", userAuthCheck, async (req, res) => {
  try {
    const author = await Editor.findById(req.params.id);

    const articles = await Article.find({ author });
    res.status(200).json({ articles });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

router.get("/getArticleById/:id", editorAuthCheck, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    res.status(200).json({ article });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

router.post("/upload", upload.single("picture"), (req, res) => {
  const file = req.file;
  if (!file) {
    const error = new Error("Please upload a file");
    error.httpStatusCode = 400;
    return next(error);
  }
  res.send(file);
});

router.get("/photo/:id", (req, res) => {
  var filename = req.params.id;

  db.collection("mycollection").findOne({ _id: ObjectId(filename) }, (err, result) => {
    if (err) return console.log(err);

    res.contentType("image/jpeg");
    res.send(result.image.buffer);
  });
});

router.get("/get-razorpay-key", (req, res) => {
  res.send({ key: process.env.RAZORPAY_KEY_ID });
});

router.post("/create-order", async (req, res) => {
  try {
    // console.log(req);
    const instance = new Razorpay({
      key_id: "rzp_test_6wtHJai3wnhKxB",
      key_secret: "z7AauVacb1Jc1ZjUK6dx59pY",
    });
    const options = {
      amount: req.body.amount,
      currency: "INR",
    };
    const order = await instance.orders.create(options);
    if (!order) return res.status(500).send("Some error occured");
    res.send(order);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

router.post("/pay-order", async (req, res) => {
  try {
    const { amount, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    const newOrder = Order({
      isPaid: true,
      amount: amount,
      razorpay: {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
      },
    });
    await newOrder.save();
    console.log(req.body);
    res.send({
      msg: "Payment was successfull",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

module.exports = router;
