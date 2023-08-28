const mongoDB = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");

const Editor = new mongoDB.Schema({
  name: { type: String, required: true },
//   key: {
//     type: Number,
//     enum: [315, 317, 319, 327],
//     default: 319,
//     // required: true,
//     // validate: authenticateKey(),
//   },
  email: {
    type: String,
    required: true,
    validate: [validator.isEmail, "Not an Email!!!"],
    unique: true,
  },
//   userName: { type: String, required: true },
  password: { type: String, required: true}
});

// Editor.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();

//   this.password = await bcrypt.hash(this.password, 12);
//   console.log(this);
//   next();
// });

// Editor.methods.CheckPass = async function (candidatePassword, userPassword) {
//   return await bcrypt.compare(candidatePassword, userPassword);
// };

module.exports = mongoDB.model("Editor", Editor);