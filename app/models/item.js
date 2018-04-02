// load the things we need
var mongoose = require('mongoose');


// define the schema for our user model
var itemSchema = mongoose.Schema({
        url             : String,
        from            : String,
        time            : { type : Date, default: Date.now },
        title           :{type:String,default:"title"},
        image           :String,
        meta            :Object,
        to              :String,
        verb            :{default:"read",type:String},
        open            :{default:false, type:Boolean},
        status          :{default:"unread",type:String},
        expire          :String,
        note            :String,
        subject         :String
      },{
          toObject: { virtuals: true },
          toJSON: { virtuals: true }
      });


itemSchema.virtual('user', {
  ref: 'User',
  localField: 'from',
  foreignField: 'local.email',
  justOne: true
});

module.exports = mongoose.model('Item', itemSchema);
