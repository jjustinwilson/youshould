// load the things we need
var mongoose = require('mongoose');


// define the schema for our user model
var itemSchema = mongoose.Schema({


        url        : String,
        user: String,
        time : { type : Date, default: Date.now },
        title:{type:String,default:"title"},
        image:String,
        meta:Object,
        who:String,
        verb:{default:"read",type:String},
        open:{default:false, type:Boolean},
        status:{default:"unread",type:String},
        expire:String,
        note:String,
        subject:String



}, {
        toObject: {virtuals:true},

    });
itemSchema.virtual('user-info', {
  ref: 'User',
  localField: 'user',
  foreignField: 'local.email'
});
// create the model for users and expose it to our app
module.exports = mongoose.model('Item', itemSchema);
