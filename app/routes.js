var Item = require('../app/models/item');
var Users = require("../app/models/user");
var shares = require("../app/shares")
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
    // app.get("/upload",function(req,res){
    //     res.render("upload.pug")
    // })
    // app.post("/upload",upload.single('image'),resizeimage,function(req,res){
    //
    //     console.log(req.resizedimage);
    //     res.render("upload.pug",{image:req.resizedimage})
    //
    //
    //
    //
    //
    // })

    // show the home page (will also have our login links)
    app.get('/', function(req, res) {
        res.render('index.ejs');
    });
    app.get("/profile",isLoggedIn,function(req,res){
        res.render("profile.pug",{"user":req.user});
    });
    app.get("/profile/edit",isLoggedIn,function(req,res){
        res.render("profile-edit.pug",{"user":req.user});
    });
    app.post("/profile/edit",isLoggedIn,upload.single('pic'),resizeimage,function(req,res){
      var update = {
        "local.email":req.body.email,
        "local.name":req.body.name,
        "local.description":req.body.description
      }
      if(req.resizedimage){
        update["local.imageURL"] = req.resizedimage
      }
        Users.findByIdAndUpdate(req.body.id,{
            $set:{update}
        },{new:true},function(err,result){
            //console.log(result)
            res.redirect("/profile/edit")
        })


    })
    // PROFILE SECTION =========================
    app.get('/list', isLoggedIn, function(req, res) {
      var itemsSent = function(callback){
        Item.find({
             user: req.user.local.email
         },function(err,list){
           if(err){
             callback(err,null)
           }
           callback(null, list)
         });
      }

      var itemsReceived = function(callback){
        Item.find({
             who: req.user.local.email
         },function(err,list){
           if(err){
             callback(err,null)
           }
           callback(null, list)
         });
      }

      var extractDomain = function getHostName(url) {
          var match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);
          if (match != null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0) {
          return match[2];
          }
          else {
              return null;
          }
      }

      var render = function(err,results){
        //console.log(results)

        res.render('list.pug', {
            user : req.user,
            itemsSent:results.itemsSent,
            itemsReceived:results.itemsReceived,
            extractDomain:extractDomain
        });
      }


      async.parallel({
        itemsSent:itemsSent,
        itemsReceived:itemsReceived
      },render)

    });
    app.post("/list",isLoggedIn,function(req,res){
      var getMeta = function(call){
        console.log("getting Meta")
        extract({ uri: req.body.url },function(err,output){

            if(err){
              console.log(err)
              call(err,null);
            }else{
              call(null,output);
            }

        });
      }

      var savePost = function(extract,callback){
        //console.log({"extracted_data":extract})
        var saveItem = new Item({
            url:req.body.url,
            user:req.user.local.email,

            title:extract.title,
            image:extract.ogImage,
            meta:extract,
            who:req.body.who,
            verb:req.body.verb
        }
        );
        saveItem.save(function(err,product){
          if(err){
            callback(err,null)
          }
            callback(null,product)
        })

      }
      var sendEmail = function(item, callback){
          let transporter = nodeMailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
              user: 'justin@jamesjwilson.com',
              pass: '4petessake'
          }
      });
      let mailOptions = {
          from: '"J. Justin Wilson" <'+req.user.local.email+'>', // sender address
          to: req.body.who, // list of receivers
          subject: "Foo", // Subject line
          text: "This is the body text", // plain text body
          html: '<b>NodeJS Email Tutorial</b>' // html body
      };

      transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              return console.log(error);
          }
          console.log('Message %s sent: %s', info.messageId, info.response);
              callback(null,info)
          });

      }

      async.waterfall([
        getMeta,
        savePost,
        sendEmail

      ],function(err,results){
        console.log(results)
        if(!err){
          //res.send(results)
          res.redirect('/list');
        }else{
          req.session.save_error = 'There was a problem saving the post.';
          res.redirect('/list');
        }
      })
    });

    app.get("/shares",isLoggedIn,shares)

    app.post("/item/remove/",isLoggedIn,function(req,res){
        Item.remove({ "_id": req.body.id }, function (err) {
          if (err){
              res.send({"result":"error"});
          }else{
              res.send({"result":"success"})
          }
        });
    })
    app.get("/user/contacts",isLoggedIn,function(req,res){
        Item.find({user:req.user.local.email}).where("who").ne(null).distinct('who', function(error, contacts) {
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
            successRedirect : '/list', // redirect to the secure profile section
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

    res.redirect('/');
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
