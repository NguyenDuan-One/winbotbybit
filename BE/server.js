require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./router');
const cookieParser = require('cookie-parser');

const app = express();
// const PORT = process.env.PORT || 3000;
const PORT = 3001
const PAYLOAD_LIMIT_SIZE = "100MB";

app.use(express.json({limit: PAYLOAD_LIMIT_SIZE}));
app.use(cors());
app.use(cookieParser());

app.use((req, res, next) => {
  res.customResponse = (status, message, data = "") => {
    res.json({
      status: status,
      message: message,
      data: data
    })
  }
  next();
})
app.use('/', routes); // Sử dụng route chung
// app.use(express.static(path.join(__dirname, '../FE/build')));


app.listen(PORT, process.env.BASE_URL, () => {
  console.log(`Server is running on port ${PORT}`);
});
