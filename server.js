require("dotenv").config();
const express = require("express");
const app = express();
const server = require("http").Server(app);
const mongoose = require("mongoose");
const stylelintVSCode = require("stylelint-vscode");
const io = require("socket.io")(server);
const passport = require("passport");
const session = require("express-session");
const passportLocalMongoose = require("passport-local-mongoose");
const { v4: uuidv4 } = require("uuid");
const bodyParser = require("body-parser");
const url = require("url");
const { ExpressPeerServer } = require("peer");
const path = require("path");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const { log } = require("console");

// Create an Express app and server as usual
app.set("view engine", "ejs");
// Set a custom path for PeerJS if needed
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/image", express.static("image"));
// // Create a PeerJS server instance
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture,
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/home",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);
// use static serialize and deserialize of model for passport session support

const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.use("/peerjs", peerServer);

app.get("/", (req, res) => {
  res.render("home");
});
app.get("/home", function (req, res) {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/home",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/home");
  }
);
let loggedIn = false;
app.get("/join", (req, res) => {
  if (req.isAuthenticated()) {
    loggedIn = true;
    res.render("join");
  } else {
    res.redirect("/login");
  }
});

app.get("/host", (req, res) => {
  loggedIn = true;
  if (req.isAuthenticated()) {
    res.render("host");
  } else {
    res.redirect("/login");
  }
});

app.get("/login", function (req, res) {
  if (req.isAuthenticated()) {
    req.logout(function (err) {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
  } else res.render("login"); // Provide a default value for error when loading the login page initially
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.post("/host", (req, res) => {
  res.redirect(
    url.format({
      pathname: `/join/${uuidv4()}`,
      query: req.body,
    })
  );
});

app.post("/register", (req, res) => {
  console.log("Registering new user...");
  console.log("Username:", req.body.username);
  console.log("Password:", req.body.password);

  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.error("Error registering user:", err);
        res.redirect("/register");
      } else {
        console.log("User registered successfully:", user);
        passport.authenticate("local")(req, res, function () {
          res.redirect("/host");
        });
      }
    }
  );
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.error(err);
      res.status(500).render("error", {
        message: "Error during login. Please try again later.",
      });
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/home");
      });
    }
  });
});

app.get("/join/:room", (req, res) => {
  res.render("room", { roomId: req.params.room, Myname: req.query.name }); //  sending uuid to client
});

app.post("/join", (req, res) => {
  res.redirect(
    url.format({
      pathname: req.body.meeting_id,
      query: req.body,
    })
  );
});

// upload file
// Set storage engine for multer

// Serve static files from the "public" directory
app.use(express.static("public"));

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, id, myname) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", id, myname);

    socket.on("messagesend", (message) => {
      console.log(message);
      io.to(roomId).emit("createMessage", message);
    });

    socket.on("tellName", (myname) => {
      console.log(myname);
      socket.to(roomId).emit("AddName", myname);
    });

    socket.on("disconnect", () => {
      socket.to(roomId).emit("user-disconnected", id);
    });
  });
});

server.listen(process.env.PORT, () => {
  console.log("Server running on port:", process.env.PORT);
});
