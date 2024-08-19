const mongoose = require('../index');

const strategiesSchema = new mongoose.Schema({
  Label: String,
  Market: String,
  PositionSide: String,
  OrderChange: Number,
  Elastic: Number,
  Turnover: Number,
  Numbs: Number,
  Amount: Number,
  Limit: Number,
  Expire: Number,
  IsActive: Boolean,
  OnlyPairs	: [String],
  Blacklist	: [String],
  botID: {
    type: mongoose.Types.ObjectId,
    ref: 'Bot',
  },
  userID: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
  // Other
  value: String,
  bookmarkList: [String],
})


const Scanner = mongoose.model('Scanner', strategiesSchema);


module.exports = Scanner;
