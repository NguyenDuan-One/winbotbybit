const mongoose = require('../index');

const botSchema = new mongoose.Schema({
  botName: String,
  Balance: Number,
  botType: String,
  Status: String,
  Server: String,
  Version: String,
  note: String,
  telegramID: String,
  telegramToken: String,
  spotSavings: Number,
  Created: Date,
  // Bot Api
  ApiKey: {
    type: String,
    unique: true,
  },
  SecretKey: String,
  UTA: Boolean,
  // 
  userID: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
});


const Bot = mongoose.model('Bot', botSchema);

module.exports = Bot;
