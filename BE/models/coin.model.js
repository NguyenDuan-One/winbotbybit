const mongoose = require('../index');

const coinSchema = new mongoose.Schema({
  symbol: String,
  volume24h: String,
});


const Coin = mongoose.model('Coin', coinSchema);

module.exports = Coin;
