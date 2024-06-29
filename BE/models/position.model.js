const mongoose = require('../index');

const positionSchema = new mongoose.Schema({
  Symbol: String,
  Side: String,
  Price: String,
  Quantity	: String,
  Pnl: String,
  Miss: Boolean,
  orderID:{
    type:String,
    required: true,
  },
  botID: {
    type: mongoose.Types.ObjectId,
    ref: 'Bot',
    required: true,
  },
});


const Position = mongoose.model('Position', positionSchema);

module.exports = Position;
