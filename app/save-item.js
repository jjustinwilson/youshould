var async = require("async")
var Item = require('../app/models/item');
var nodeMailer = require("nodemailer");
const extract = require('meta-extractor');
const Email = require('email-templates');
module.exports = function(req,res) {
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

  var savePost = function(extract,cb){
    console.log({"extracted_data":extract})
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

  var render = function(err,results){
    console.log(results)
    if(!err){
      //res.send(results)
      res.redirect('/list');
    }else{
      req.session.save_error = 'There was a problem saving the post.';
      res.redirect('/list');
    }
  }

  var newEmail = function(item,callback){
          console.log({body:item})
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
            from: req.user.local.email
          },
          // uncomment below to send emails in development/test env:
          send: false,
          preview:true,
          transport: nodeMailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
              user: 'justin@jamesjwilson.com',
              pass: '4petessake'
            }
          })
        });

        email
          .send({
            template: '../app/emails/notification',
            message: {
              to: req.body.who
            },
            locals: {
              user: req.user,
              item: item,

            }
          })
          .then(callback);

  }
  async.waterfall([
    getMeta,
    savePost,
    //sendEmail
    newEmail
  ],render);


}
