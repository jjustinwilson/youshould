var app = require('express');
var async = require('async')
var Item = require('../app/models/item');
var extractDomain = require("../app/extractdomain"
)
module.exports = function(req,res) {
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
  var render = function(err,results){
    if(err){
      res.status(400).render("error.pug",{user:req.user})
    }
    
    res.render('shares.pug', {
        user : req.user,
        itemsSent:results.itemsSent,
        extractDomain:extractDomain
      });
  }
  async.parallel({
    itemsSent:itemsSent
  },render)


  //res.render("shares.pug",{user:req.user})
}
