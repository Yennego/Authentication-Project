
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");


const app = express();


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: false
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

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
    password: String,
    googleId: String,
    secret: String
});

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)

const User = new mongoose.model("User", userSchema)

passport.use(User.createStrategy());

passport.serializeUser(async function(user, done) {
  try {
    done(null, user.id)
  } catch (error) {
    done(error, null);
  }
});

passport.deserializeUser(async function(id, done) {
  try {
    const user = await User.findById(id).exec()
    done(null, user)
  } catch (error) {
    done(error, null)
  }
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.get("/", async function(req, res){
    try {
    res.render("home"); 
    } catch (error) {
       console.error("error sending request")
    }
});

app.get("/auth/google", 
    passport.authenticate("google", { scope: ["profile"] }) 
 );

 app.get("/auth/google/secrets", 
     passport.authenticate("google", { failureRedirect: "/login" }),
     function(req, res) {
      res.redirect("/secrets");
  });

app.get("/login", async function(req, res){
   try {
    res.render("login")
   } catch (error) {
    console.error("error getting login page:", error);
   }
});

app.get("/register", async function(req, res){
  try {
    res.render("register")
   } catch (error) {
    console.error("error getting register page:", error);
   }
});

app.get("/secrets", async function (req, res){
  try {
    const foundUsers = await User.find({"secret": {$ne: null}});
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      } else {
        console.log("error rendering secrets page")
      }
  } catch (error) {
    console.error("error rendering secrets page:", error);
  }
});

app.get("/submit", async function (req, res){
  try {
    if (req.isAuthenticated()){
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error("error rendering submit page:", error);
  }
});

app.post("/submit", async function(req, res){
  const submittedSecret = req.body.secret;

  try {
    const foundUser = await User.findById(req.user.id);
        if (foundUser) {
          // console.log("Found User:", foundUser);
          foundUser.secret = submittedSecret;
          await foundUser.save();
            res.redirect("/secrets");
          };
  } catch (error) {
    console.error(error);
  }
});

app.get("/logout", async function(req, res){
  try {
    req.logout(async function(err){
      if (err) {
        console.log(err);
      } else {
        res.redirect("/");
      }
    });
  } catch (error) {
    console.error("error while loggingOut:", error);
  }
});

app.post("/register", async function(req, res){
    
  User.register({username: req.body.username}, req.body.password, async function(err, user){
    try {
      if (err) {
        console.log(err);
        res.redirect("/register")
      } else {
        passport.authenticate("local")(req, res, async function(){
          res.redirect("/secrets")
        });
      }
    } catch (error) {
      console.error("registeredUser authentication error:", error);
    }
  });
});

app.post("/login", async function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, async function(err){
    try {
      if(err) {
        console.log(err);
      } else {
        passport.authenticate("local")(req, res, async function(){
          res.redirect("/secrets")
        });
      }
    } catch (error) {
      console.error("loggedinUser authentication error:", error);
    }
  });
    
});

app.listen(3000, function() {
    console.log("server starting on port 3000")
});
