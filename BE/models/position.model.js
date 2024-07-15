const mongoose = require('../index');

const positionSchema = new mongoose.Schema({
  Symbol: {
    type: String,
    required: true,
  },
  Side: String,
  Price: String,
  Quantity	: String,
  Pnl: String,
  Time: Date,
  Miss: Boolean,
  botID: {
    type: mongoose.Types.ObjectId,
    ref: 'Bot',
    required: true,
  },
});


const Position = mongoose.model('Position', positionSchema);
Position.createIndexes()

module.exports = Position;
