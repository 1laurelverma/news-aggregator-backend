const passport = require("passport");
const { check, validationResult } = require("express-validator/check");
const localStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const UserModel = require("../models/user");
const JWTstrategy = require("passport-jwt").Strategy;
const ExtractJWT = require("passport-jwt").ExtractJwt;
const jwt = require("jsonwebtoken");

passport.use(
  "signup",
  new localStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, categories, done) => {
      try {
        const user = await UserModel.create({ email, password, categories });

        return done(null, user);
      } catch (error) {
        console.log(error);
      }
    }
  )
);

passport.use(
  "login",
  new localStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await UserModel.findOne({ email });

        if (!user) {
          return done(null, false, { message: "User not found" });
        }

        const validate = await user.isValidPassword(password);

        if (!validate) {
          return done(null, false, { message: "Wrong Password" });
        }

        return done(null, user, { message: "Logged in Successfully" });
      } catch (error) {
        return done(error);
      }
    }
  )
);

const tokenAuth = (req, res, next) => {
  const token = req.headers.token;

  if (token) {
    const decode = jwt.verify(token, "TOP_SECRET");
    if (decode) next();

    res.json({
      login: false,
      data: "Wrong token provided",
    });
  } else {
    // Return response with error
    res.json({
      login: false,
      data: "No token provided",
    });
  }
};

module.exports = tokenAuth;
