var Item = require('../app/models/item');
var Users = require("../app/models/user");
const extract = require('meta-extractor');
const async = require("async");
var log = require('why-is-node-running');
var jwt = require('jsonwebtoken');
var auth = require("../config/auth.js");

var JwtStrategy = require('passport-jwt').Strategy,
    ExtractJwt = require('passport-jwt').ExtractJwt;
module.exports = function(app, passport) {

// normal routes ===============================================================

    // show the home page (will also have our login links)
    app.get('/', function(req, res) {
        res.render('index.ejs');
    });

    // PROFILE SECTION =========================
    app.get('/list', isLoggedIn, function(req, res) {
      log();
      console.log("logged in");
     var pro = Item.find({
          user: req.user.local.email
      }).exec();

      pro.then(function(response){
          console.log(response);
          res.render('list.pug', {
              user : req.user,
              list:response
          });
      })
      .then(null);



    });
    app.post("/list",function(req,res){
      var getMeta = function(call){
        console.log("getting Meta")
        extract({ uri: req.body.url },function(err,output){
            console.log(output)
            if(err){
              console.log(err)
              call(err,null);
            }else{
              call(null,output);
            }

        });
      }

      var savePost = function(extract,callback){
        console.log({"extracted_data":extract})
        var saveItem = new Item({
            url:req.body.url,
            //user:req.user.local.email,
            user:"jwilson@ij.org",
            title:extract.ogTitle,
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


      async.waterfall([
        getMeta,
        savePost

      ],function(err,results){
        console.log(results)
        if(!err){
          res.redirect('/list');
        }else{
          req.session.save_error = 'There was a problem saving the post.';
          res.redirect('/list');
        }
      })
    });


    //isLoggedIn,
    app.post('/listfoo', function(req,res){





        //Gets Meta Data From Item URL
        var getMeta = function(callback){
          console.log("getting Meta")
          extract({ uri: req.body.url },function(err,output){
              console.log(output)
              if(err){
                console.log(err)
                callback(err,null);
              }
              callback(null,output);
          });
        }

        //Saves Post to Database
        var savePost = function(extract,callback){
          console.log({"extracted_data":extract})
          var saveItem = new Item({
              url:req.body.url,
              //user:req.user.local.email,
              user:"jwilson@ij.org",
              title:output.ogTitle,
              image:output.ogImage,
              meta:output,
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
        //Renders The Final List
        var getList = function(callback){
          var list = Item.find({
               user: req.user.local.email
           },function(err,list){
             if(err){
               callback(err,null)
             }
             callback(null, list)
           })
        }
        var render = function(err,results){
          console.log(results)
          res.render('list.pug', {
              user : req.user,
              list:results.getList
          });
        }

        var waterfall = function(callback){
          async.waterfall([
                            getMeta,
                            //savePost,
                            //getList
                          ],
                            function(results){
                              res.send(results);
                            })
        }
        // async.parallel({
        //   "waterfall":
        //   "meta":getMeta,
        //   "savePost":savePost,
        //   "getList":getList
        // },render);

    });

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








    // LOGOUT ==============================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
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
