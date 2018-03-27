var app = require('express');
var async = require('async')
var Item = require('../app/models/item');
var extractDomain = require("../app/extractdomain"
)
module.exports = function(req,res) {
  var sent = function(callback){
    Item.find({
         user: req.user.local.email
     },function(err,list){
       if(err){
         callback(err,null)
       }
       callback(null, list)
     });
  }
  var inbox = function(callback){
    Item.find({
         who: req.user.local.email
     },function(err,list){
       if(err){
         callback(err,null)
       }else{
         callback(null, list)
       }


     });
  }
  var itemsRead = function(callback){
    Item.find({
         who: req.user.local.email,
         status: "read"
     },function(err,list){
       if(err){
         callback(err,null)
       }
       callback(null, list)
     });
  }
  var itemsArchived = function(callback){
    Item.find({
         who: req.user.local.email,
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

          res.render('shares.pug', {
              user : req.user,
              sent:results.sent,
              inbox:results.inbox,
              itemsRead:results.itemsRead,
              itemsArchived:itemsArchived,
              extractDomain:extractDomain
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
