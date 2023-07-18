//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

console.log(process.env.API_KEY)

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: false
}));

async function connectToDatabase() {
    try {
        await mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});
        console.log("Connected to the database");
    } catch (error) {
        console.error("error connecting to database:", error);
    }
}

connectToDatabase();

const userSchema = new mongoose.Schema ({
    email: String,
    password: String
});

userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema)

app.get("/", async function(req, res){
    try {
      res.render("home");  
    } catch (error) {
       console.error("error sending request")
    }
});

app.get("/login", async function(req, res){
    try {
      res.render("login");  
    } catch (error) {
       console.error("error sending request")
        
    }
});

app.get("/register", async function(req, res){
    try {
      res.render("register");  
    } catch (error) {
       console.error("error sending request")
    }
});

app.post("/register", async function(req, res){
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });

    try {
      const savedUser = await newUser.save();
      if(!savedUser) {
        console.log("Error saving user")
      } else {
        res.render("secrets");
      }
    } catch (error) {
        console.error("error saving user:", error);
    }
});

app.post("/login", async function(req, res){
    const username = req.body.username;
    const password = req.body.password;
    try {
       const foundUser = await User.findOne({email: username});
      if(!foundUser) {
        console.log("User not found");
      } else {
        if(foundUser.password === password) {
            res.render("secrets")
        }
        // if(foundUser) {
           
        // }
      }
    } catch (error) {
      console.error("error saving user:", error);
    }
});





app.listen(3000, function() {
    console.log("server starting on port 3000")
});