const mongoose = require('../index');

const botApiSchema = new mongoose.Schema({
  ApiKey: String,
  SecretKey: String,
  UTA: Boolean,
  botID: {
    type: mongoose.Types.ObjectId,
    ref: 'Bot',
  },
  userID: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
  
});


const BotApi = mongoose.model('BotApi', botApiSchema);

module.exports = BotApi;
