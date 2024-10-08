const mongoose = require('../index');

const childrenStrategiesSchema = new mongoose.Schema({
  PositionSide: String,
  Amount: Number,
  OrderChange: Number,
  TimeTemp: String,
  AmountAutoPercent: Number,
  AmountExpire: Number,
  AmountIncreaseOC: Number,
  Limit: Number,
  Expire: Number,
  IsActive: Boolean,
  Reverse: Boolean,
  Adaptive: Boolean,
  Remember: Boolean,
  botID: {
    type: mongoose.Types.ObjectId,
    ref: 'Bot',
  },
  userID: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
  // Other
  symbol: String,
  value: String,
});

const strategiesSchema = new mongoose.Schema({
  label: {
    type: String,
    unique: true,
  },
  value: {
    type: String,
    unique: true,
  },
  volume24h: String,
  bookmarkList: [String],
  children: [childrenStrategiesSchema]
})


const Margin = mongoose.model('Margin', strategiesSchema);


module.exports = Margin;
