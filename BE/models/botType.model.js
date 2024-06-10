const mongoose = require('../index');

const botTypeSchema = new mongoose.Schema({
  name: String,
  note: String,
});


const BotType = mongoose.model('BotType', botTypeSchema);

module.exports = BotType;
