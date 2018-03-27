var async = require("async")
var Item = require('../app/models/item');
var nodeMailer = require("nodemailer");
const extract = require('meta-extractor');
const Email = require('email-templates');
module.exports = function(req,res) {
  var getMeta = function(call){
    //console.log("getting Meta")
    extract({ uri: req.body.url },function(err,output){

        if(err){
          console.log(err)
          call(err,null);
        }else{
          call(null,output);
        }

    });
  }

  var savePost = function(extract,cb){
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
        console.log({error:err})
        cb(err,null)
      }else{
        cb(null,product)
      }
    })
  }

  var otherItems = function(item,callback){
    Item.find({
         who: req.user.local.email
     },function(err,list){
       if(err){
         callback(err,null,null)
       }else{
         callback(null, item, list)
       }


     });
  }
  var render = function(err,results){
    //console.log(results)
    if(!err){
      //res.send(results)
      //res.redirect('/list');
      res.json({result:"success",saved:results})
    }else{
      //req.session.save_error = 'There was a problem saving the post.';
      //res.redirect('/list');
      console.log(err)
      res.json({error:err})
    }
  }

  var newEmail = function(item,otherItems,callback){
          console.log({item:item,otheritems:otherItems})
          let transporter = nodeMailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
              user: 'justin@jamesjwilson.com',
              pass: '4petessake'
            }
          });

          const email = new Email({
          message: {
            from: req.user.local.email,
            //subject: req.user.local.name+" shared something with you"
          },
          // uncomment below to send emails in development/test env:
          send: true,
          preview:false,
          transport: nodeMailer.createTransport({
              host: 'smtp.gmail.com',
              port: 465,
              secure: true,
              auth: {
                  user: 'justin@jamesjwilson.com',
                  pass: '4petessake'
                }
              }),
          views: {
            options: {
              extension: 'ejs' // <---- HERE
            }
          }
        });

        email
          .send({
            template: '../app/emails/notification',
            message: {
              to: req.body.who
            },
            locals: {
              req:req,
              user: req.user,
              item: item,
              otherItems: otherItems

            }
          })
          .then(function(data){
            callback(null, data)
          })
          .catch(function(err){
            console.log(err);

          });

  }
  async.waterfall([
    getMeta,
    savePost,
    //sendEmail
    otherItems,
    newEmail
  ],render);
}
