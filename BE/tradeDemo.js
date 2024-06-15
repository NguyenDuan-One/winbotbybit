const { RestClientV5, WebsocketClient } = require('bybit-api');

const client = new RestClientV5({
    testnet: false,
    key: 'foRfrB7L1GgXt1Ly5O',
    secret: 'zxbzLknpNW0k1i2Ze8UFtQq2HEK4tgVqFjgp',

});
const price = 0
const qty = 10 / price
const symbol = "NOTUSDT"
let wsConfig = {
    market: 'v5'
}
let wsSymbol = new WebsocketClient(wsConfig);

let orderState = false
let orderID = ""

wsSymbol.subscribeV5([`kline.1.${symbol}`], 'linear').catch((err) => { console.log(err) });
wsSymbol.on('update', async (dataCoin) => {
    if (dataCoin.topic.indexOf(`kline.1.${symbol}`) != -1) {
        if (dataCoin.data[0].confirm == false) {
            const open = +dataCoin.data[0].open
            !orderState && client
                .submitOrder({
                    category: 'linear',
                    symbol,
                    side: 'Buy',
                    orderType: 'Limit',
                    qty: "500",
                    price: (open - open * 2 / 100).toFixed(6),
                })
                .then((response) => {
                    console.log(response);
                    orderState = true
                    orderID = response.result.orderId
                })
                .catch((error) => {
                    console.error(error);
                });
        }
        else {
            client
                .cancelOrder({
                    category: 'linear',
                    symbol: 'NOTUSDT',
                    orderId: orderID, 
                })
                .then((response) => {
                    if (response.retCode === 0) {
                        orderState = false
                        orderID = ''
                    }
                })
                .catch((error) => {
                    console.error(error);
                });
        }
    }

})

//Báo lỗi socket
wsSymbol.on('error', (err) => {
    console.error('error', err);
});

// client
//     .submitOrder({
//         category: 'linear',
//         symbol,
//         side: 'Buy',
//         orderType: 'Limit',
//         qty: "500",
//         price: "0.019519",
//     })
//     .then((response) => {
//         console.log(response);
//         setTimeout(() => {
//             client
//             .cancelOrder({
//                 category: 'linear',
//                 symbol: 'NOTUSDT',
//                 orderId:response.result.orderId,
//             })
//             .then((response) => {
//                 console.log(response);
//             })
//             .catch((error) => {
//                 console.error(error);
//             });
//         },10000)
//     })
//     .catch((error) => {
//         console.error(error);
//     });
