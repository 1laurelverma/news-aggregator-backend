const mongoDB = require("mongoose");
const validator = require("validator");

const Article = new mongoDB.Schema(
  {
    title: { type: String, required: true },
    author: { type: mongoDB.Schema.ObjectId, ref: "Editor" },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoDB.model("Article", Article);