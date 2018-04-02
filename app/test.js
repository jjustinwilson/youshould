var mongoose = require('mongoose');
var Users = require("../app/models/user");
var Items = require("../app/models/item")


module.exports = function(req,res) {
  // Users.find({}).populate("user-items").exec(function(error, bands) {
  // res.json(bands)
  // });
    Items.find({}).populate('user').exec(function(error, bands) {
    console.log(JSON.stringify(bands))
    //console.log(Object.keys(bands))
    res.send(bands[1].user)
    });

}
