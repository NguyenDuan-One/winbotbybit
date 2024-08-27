const Big = require('big.js');

// Khởi tạo giá trị priceOrderOC
const priceOrderOC = new Big(3891);

// Định nghĩa bước làm tròn
const step = new Big(84);

// Thực hiện phép chia và làm tròn xuống
const roundedDown = new Big(Math.floor(priceOrderOC.div(step).toNumber())).times(step);

console.log("TP", roundedDown.toString());
