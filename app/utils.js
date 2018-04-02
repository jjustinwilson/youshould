var yup = require("yup");

module.exports = {
    hasUser: function hasUser(item){
      console.log(item)
      var schema = yup.object()
                    .shape({
                      'user':yup.object().shape({
                        local:yup.object().shape({
                          imageURL:yup.string().required()
                        })
                      })
                    })

      return schema.isValidSync(item)
    },
    extractDomain:function(url){
      var match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);
      if (match != null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0) {
      return match[2];
      }
      else {
          return null;
      }
    }

}
