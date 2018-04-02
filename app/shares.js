var app = require('express');
var async = require('async')
var Items = require('../app/models/item');

var yup = require("yup");
var utils = require("../app/utils");

module.exports = function(req,res) {



  var sent = function(callback){
    Items.find({
         from: req.user.local.email
     },function(err,list){
       if(err){
         callback(err,null)
       }
       // if(check(list[0]).has("user")){
       //   console.log(list[0])
       // }

       callback(null, list)

     });
  }
  var inbox = function(callback){



    Items.find({to: req.user.local.email}).populate('user').exec(function(error, bands) {
      //res.json(bands)

      callback(null, bands)

      });
  }
  var itemsRead = function(callback){
    Items.find({
         to: req.user.local.email,
         status: "read"
     },function(err,list){
       if(err){
         callback(err,null)
       }
       callback(null, list)
     });
  }
  var itemsArchived = function(callback){
    Items.find({
         to: req.user.local.email,
         status: "archive"
     },function(err,list){
       if(err){
         callback(err,null)
       }
       callback(null, list)
     });
  }
  var render = function(err,results){
    if(err){
      res.status(400).render("error.pug",{user:req.user})
    }else{
          console.log("maintest", utils.hasUser({
            "user":{
              "local":{
                "name":"Justin Wilson",
                "email":"justin@jamesjwilson.com",
                "imageURL":"http://ij.org/favicon.ico"
              }
            },
            "url": "foobar",
            "note":"This is a note"
          }))
          res.render('shares.pug', {
              user : req.user,
              sent:results.sent,
              inbox:results.inbox,
              itemsRead:results.itemsRead,
              itemsArchived:itemsArchived,
              utils:utils
            });
    }

  }
  async.parallel({
    sent,
    inbox,
    itemsRead,
    itemsArchived
  },render)


  //res.render("shares.pug",{user:req.user})
}
