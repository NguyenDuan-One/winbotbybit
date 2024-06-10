const mongoose = require('../index');

const childrenStrategiesSchema = new mongoose.Schema({
  value: String,
  PositionSide: String,
  Amount: Number,
  OrderChange: Number,
  Candlestick: String,
  TakeProfit: Number,
  ReduceTakeProfit: Number,
  ExtendedOCPercent: Number,
  Ignore: Number,
  EntryTrailing: Number,
  StopLose: Number,
  IsActive: Boolean,
  Remember: Boolean,
  botID:{
    type:mongoose.Types.ObjectId,
    ref:'Bot',
  }
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
  children: [childrenStrategiesSchema]
})


const Strategies = mongoose.model('Strategies', strategiesSchema);

module.exports = Strategies;
