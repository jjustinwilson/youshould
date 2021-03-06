// load the things we need
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

// define the schema for our user model
var userSchema = mongoose.Schema({

    local            : {
        email        : String,
        password     : String,
        name         : String,
        description  : String,
        imageURL     : String
    },
    facebook         : {
        id           : String,
        token        : String,
        name         : String,
        email        : String
    },
    twitter          : {
        id           : String,
        token        : String,
        displayName  : String,
        username     : String
    },
    google           : {
        id           : String,
        token        : String,
        email        : String,
        name         : String
    }

},{toJSON: { virtuals: true } });
userSchema.virtual('user-items', {
  ref: 'Item',
  localField: 'local.email',
  foreignField: 'from'
});
// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    //console.error(password, this.local.password)

    return bcrypt.compareSync(password, this.local.password);
};
userSchema.methods.comparePassword = function (passw, cb) {

    bcrypt.compare(passw, this.local.password, function (err, isMatch) {
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};
// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);
