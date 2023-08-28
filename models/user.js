const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  categories: {
    type: [String],
    enum: [
      "general",
      "sports",
      "health",
      "entertainment",
      "business",
      "technology",
    ],
  },
});

// UserSchema.pre(
//   'save',
//   async function(next) {
//     const user = this;
//     const hash = await bcrypt.hash(this.password, 10);
//    // this.categories = Array.isArray(this.categories) ? this.categories : [this.categories];

//     this.password = hash;
//     next();
//   }

// );

// UserSchema.methods.isValidPassword = async function(password) {
//     const user = this;
//     const compare = await bcrypt.compare(password, user.password);

//     return compare;
//   }

const UserModel = mongoose.model("user", UserSchema);

module.exports = UserModel;
