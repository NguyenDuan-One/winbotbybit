const backup = require('mongodb-backup');

const uri = 'mongodb://localhost:27017/crypto-bot';
const root = "backup"

backup({
    uri, 
    root,
    callback: function(err) {

        if (err) {
          console.error(err);
        } else {
          console.log('finish');
        }
      }
})
