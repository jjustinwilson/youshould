var Item = require('../app/models/item');
var Users = require("../app/models/user");
var shares = require("../app/shares")
var reader = require("../app/reader");
var test = require("../app/test")
var saveItem = require("../app/save-item")
const extract = require('meta-extractor');
const async = require("async");
//var log = require('why-is-node-running');
var jwt = require('jsonwebtoken');
var auth = require("../config/auth.js");
var JwtStrategy = require('passport-jwt').Strategy,
    ExtractJwt = require('passport-jwt').ExtractJwt;
var nodeMailer = require("nodemailer");
var multer  = require('multer');
var mime = require('mime/lite');
var crypto = require('crypto');
const fs = require('fs');
const sharp = require('sharp');
var pocket = require("pocket-api");
var request = require("request");

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/profile')
  },
  filename: function (req, file, cb) {
    crypto.pseudoRandomBytes(16, function (err, raw) {
      cb(null, raw.toString('hex') + Date.now() + '.' + mime.getExtension(file.mimetype));
    });

  }
});
var upload = multer({ storage: storage });
//var upload = multer({ dest: 'public/profile' })



module.exports = function(app, passport) {

// normal routes ===============================================================


    // show the home page (will also have our login links)
    app.get("/",isLoggedIn,shares)
    app.get("/reader/:id", isLoggedIn,reader)
    app.get("/test",test);
    app.get("/react",function(req,res){


        Item.find({
             who: "justin@jamesjwilson.com"
         },function(err,list){
           if(err){
             callback(err,null)
           }else{
             res.render("react.ejs",{list:list})
           }


         });


    })
    app.get('/start', function(req, res) {
        res.render('index.ejs');
    });
    app.get("/profile",isLoggedIn,function(req,res){
        res.render("profile.pug",{"user":req.user});
    });
    app.get("/profile/edit",isLoggedIn,function(req,res){
        res.render("profile-edit.pug",{"user":req.user});
    });

    app.post("/profile/edit",isLoggedIn,upload.single('pic'),resizeimage,function(req,res){
      console.log(req.body)
      var update = {
        "local.email":req.body.email,
        "local.name":req.body.name,
        "local.description":req.body.description
      }
      if(req.resizedimage){
        update["local.imageURL"] = req.resizedimage
      }
        Users.findByIdAndUpdate(req.body.id,{
            $set:update
        },{new:true},function(err,result){
            console.log(result)
            res.redirect("/profile/edit")
        })


    })

    app.get("/image-square",function(req,res){
        //res.send(req.query.image)
        var resizer = sharp().resize(170, 170).toBuffer(function(err,data,info){
          if(err){
            res.send(error)
          }else{
            res.set('Content-Type', 'image/png');
            res.send(data);

          }
        });
      request(req.query.image).pipe(resizer)




    })
    app.get("/image-narrow",function(req,res){
        //res.send(req.query.image)
        var resizer = sharp().resize(600, 200).toBuffer(function(err,data,info){
          if(err){
            res.send(error)
          }else{
            res.set('Content-Type', 'image/png');
            res.send(data);

          }
        });
      request(req.query.image).pipe(resizer)




    })
    // PROFILE SECTION =========================

    app.post("/item/save",isLoggedIn,saveItem)


app.get("/pocket",function(req,res){
    var getRequestToken = function(callback){
      pocket.getRequestToken( auth.pocket, "http://localhost:8080/pocket-finish", function( data ) {
        console.log( data );
        callback(null, data)
      });
    }

    var render  = function(err,result){
        console.log(result)
        var url = "https://getpocket.com/auth/authorize?request_token=" + result.code+"&redirect_uri=http://localhost:8080/pocket-finish/"+ result.code;
        res.redirect(url);
    }


      async.waterfall([
        getRequestToken
      ],render)



})
app.get("/pocket-finish/:code",function(req,res){
  //req.send(res.params)
  pocket.getAccessToken(
    auth.pocket,
    req.params.code,
    function(result){
      res.send(result);
    }
  )
})



    app.post("/item/remove/",isLoggedIn,function(req,res){
        Item.remove({ "_id": req.body.id }, function (err) {
          if (err){
              res.send({"result":"error"});
          }else{
              res.send({"result":"success"})
          }
        });
    });
    app.post("/item/archive/",function(req,res){
      console.log(req.body)
      Item.findByIdAndUpdate(req.body.id,{
          $set:{status:"archive"}
      },{new:true},function(err,result){
          if(err){
            console.log(err)
            res.send({result:"error"})
          }else{
              res.send({result:"success"})
            }
        }
      );
    });
    app.post("/item/open/",isLoggedIn,function(req,res){

          Item.findByIdAndUpdate(req.body.id,{
              $set:{open:req.body.open}
          },{new:true},function(err,result){
              if(err){
                res.send({result:"error"})
              }else{
                  res.send({result:"success"})
                }
            }
          );
    })
    app.get("/item/redirect/:id",function(req,res){

       var getURL = function(callback){
         Item.findById(req.params.id,function(err,response){
           if(err){
             console.log("errr",err);
             return callback(err, null);
           }else{
             response.status = "Clicked";
             response.save(function(err){
               if(err){
                 callback(err,null);
               }else{
                 callback(null,response.url);
               }

             })

           }
         })
       }

      var finished = function(err,result){
        res.redirect(result)
      }
      async.waterfall([
        getURL
      ],finished)

    });
    app.get("/user/contacts",function(req,res){
        var user = "justin@jamesjwilson.com";
        Item.find({user:user}).where("who").ne(null).distinct('who', function(error, contacts) {
            res.json(contacts);
        });
    });


    // LOGOUT ==============================
app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});





    app.post('/api/signin', function(req, res) {

      Users.findOne({
        'local.email' : req.body.email
      }, function(err, user) {
        if (err) throw err;

        if (!user) {

          res.status(401).send({success: false, msg: 'Authentication failed. User not found.'});
        } else {
          // check if password matches
          console.log(user.local.password)
          user.comparePassword(req.body.password, function (err, isMatch) {
            if (isMatch && !err) {
              // if user is found and password is right create a token
              console.log(user)
              var token = jwt.sign({"user":user}, auth.secret);
              // return the information including token as JSON
              res.json({success: true, token: 'JWT ' + token});
            } else {
              res.status(401).send({success: false, msg: 'Authentication failed. Wrong password.'});
            }
          });
        }
      });
    });

    var jwtOptions = {}
    jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
    jwtOptions.secretOrKey = 'myxj12neat';

    var strategy = new JwtStrategy(jwtOptions, function(jwt_payload, next) {
      console.log('payload received', jwt_payload);
      // usually this would be a database call:

      next(null,true);
    });

  passport.use("foo",strategy);

    app.get("/api/token2",passport.authenticate('foo', { session: false }),function(req,res){
       res.status(200).send({"foo":"bar"})
    });



    app.get("/api/token",function(req,res){
      var token = jwt.sign({ id: "5aafc99774d2409eee9d6705" }, auth.secret, {
        expiresIn: 2592000 // expires in 30days
      });
      res.status(200).send({ auth: true, token: token });


    });




    app.get('/api/me', verifyToken,function(req, res) {
      var token = req.headers['x-access-token'];
      if (!token) return res.status(401).send({ auth: false, message: 'No token provided.' });

      jwt.verify(token, auth.secret, function(err, decoded) {
        if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
        Users.findById(req.userId,function(err,response){
          if(err){
            console.log("errr",err);
            return done(err, null);
          }else{
            res.status(200).send({
              user:req.userId,
              userProfile:response

            });
          }
        })

      });










});


// =============================================================================
// AUTHENTICATE (FIRST LOGIN) ==================================================
// =============================================================================

    // locally --------------------------------
        // LOGIN ===============================
        // show the login form
        app.get('/login', function(req, res) {
            res.render('login.ejs', { message: req.flash('loginMessage') });
        });

        // process the login form
        app.post('/login', passport.authenticate('local-login', {
            successRedirect : '/', // redirect to the secure profile section
            failureRedirect : '/login', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        }));

        // SIGNUP =================================
        // show the signup form
        app.get('/signup', function(req, res) {
            res.render('signup.ejs', { message: req.flash('signupMessage') });
        });

        // process the signup form
        app.post('/signup', passport.authenticate('local-signup', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/signup', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        }));

    // facebook -------------------------------

        // send to facebook to do the authentication
        app.get('/auth/facebook', passport.authenticate('facebook', { scope : ['public_profile', 'email'] }));

        // handle the callback after facebook has authenticated the user
        app.get('/auth/facebook/callback',
            passport.authenticate('facebook', {
                successRedirect : '/profile',
                failureRedirect : '/'
            }));

    // twitter --------------------------------

        // send to twitter to do the authentication
        app.get('/auth/twitter', passport.authenticate('twitter', { scope : 'email' }));

        // handle the callback after twitter has authenticated the user
        app.get('/auth/twitter/callback',
            passport.authenticate('twitter', {
                successRedirect : '/profile',
                failureRedirect : '/'
            }));


    // google ---------------------------------

        // send to google to do the authentication
        app.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));

        // the callback after google has authenticated the user
        app.get('/auth/google/callback',
            passport.authenticate('google', {
                successRedirect : '/profile',
                failureRedirect : '/'
            }));

// =============================================================================
// AUTHORIZE (ALREADY LOGGED IN / CONNECTING OTHER SOCIAL ACCOUNT) =============
// =============================================================================

    // locally --------------------------------
        app.get('/connect/local', function(req, res) {
            res.render('connect-local.ejs', { message: req.flash('loginMessage') });
        });
        app.post('/connect/local', passport.authenticate('local-signup', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/connect/local', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
        }));

    // facebook -------------------------------

        // send to facebook to do the authentication
        app.get('/connect/facebook', passport.authorize('facebook', { scope : ['public_profile', 'email'] }));

        // handle the callback after facebook has authorized the user
        app.get('/connect/facebook/callback',
            passport.authorize('facebook', {
                successRedirect : '/profile',
                failureRedirect : '/'
            }));

    // twitter --------------------------------

        // send to twitter to do the authentication
        app.get('/connect/twitter', passport.authorize('twitter', { scope : 'email' }));

        // handle the callback after twitter has authorized the user
        app.get('/connect/twitter/callback',
            passport.authorize('twitter', {
                successRedirect : '/profile',
                failureRedirect : '/'
            }));


    // google ---------------------------------

        // send to google to do the authentication
        app.get('/connect/google', passport.authorize('google', { scope : ['profile', 'email'] }));

        // the callback after google has authorized the user
        app.get('/connect/google/callback',
            passport.authorize('google', {
                successRedirect : '/profile',
                failureRedirect : '/'
            }));

// =============================================================================
// UNLINK ACCOUNTS =============================================================
// =============================================================================
// used to unlink accounts. for social accounts, just remove the token
// for local account, remove email and password
// user account will stay active in case they want to reconnect in the future

    // local -----------------------------------
    app.get('/unlink/local', isLoggedIn, function(req, res) {
        var user            = req.user;
        user.local.email    = undefined;
        user.local.password = undefined;
        user.save(function(err) {
            res.redirect('/profile');
        });
    });

    // facebook -------------------------------
    app.get('/unlink/facebook', isLoggedIn, function(req, res) {
        var user            = req.user;
        user.facebook.token = undefined;
        user.save(function(err) {
            res.redirect('/profile');
        });
    });

    // twitter --------------------------------
    app.get('/unlink/twitter', isLoggedIn, function(req, res) {
        var user           = req.user;
        user.twitter.token = undefined;
        user.save(function(err) {
            res.redirect('/profile');
        });
    });

    // google ---------------------------------
    app.get('/unlink/google', isLoggedIn, function(req, res) {
        var user          = req.user;
        user.google.token = undefined;
        user.save(function(err) {
            res.redirect('/profile');
        });
    });


};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/start');
}

function verifyToken(req, res, next) {
  var token = req.headers['x-access-token'];

  if (!token)
    return res.status(403).send({ auth: false, message: 'No token provided.' });
  jwt.verify(token, auth.secret, function(err, decoded) {
    if (err)
    return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
    // if everything good, save to request for use in other routes
    req.userId = decoded.id;
    next();
  });
}
function resizeimage(req,res,next){
  if(req.file){
    var userid = req.user._id
    const readStream = fs.createReadStream(req.file.path);
    let transform = sharp(req.file.path)
          .toFormat("jpg")
          .resize(300,300)
          .toFile("public/profile/300/"+userid+".jpg",function(err){
            if(err){console.log(err);return; next();}
            req.resizedimage = userid+".jpg";
            next();

          })
  }else{
    next();
  }



}
