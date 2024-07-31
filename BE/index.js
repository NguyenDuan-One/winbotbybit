require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(`mongodb://${process.env.MONGO_IP}:27017/crypto-bot`, {
  // useNewUrlParser: true,
  // useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});

module.exports = mongoose;