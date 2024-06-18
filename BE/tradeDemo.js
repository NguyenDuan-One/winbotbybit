const { RestClientV5, WebsocketClient } = require('bybit-api');

const client = new RestClientV5({
    testnet: false,
    key: 'foRfrB7L1GgXt1Ly5O',
    secret: 'zxbzLknpNW0k1i2Ze8UFtQq2HEK4tgVqFjgp',
    enable_time_sync: true,
});

const wsConfig = {
    key: 'foRfrB7L1GgXt1Ly5O',
    secret: 'zxbzLknpNW0k1i2Ze8UFtQq2HEK4tgVqFjgp',
    market: 'v5',
}

const wsSymbol = new WebsocketClient(wsConfig);

const price = 0
const qty = 10 / price
const symbol = "1000BEERUSDT"

let orderID = ""

let digitDefault = 0


wsSymbol.subscribeV5(['order'], "linear").catch((err) => { console.log(err) });
wsSymbol.subscribeV5([`kline.1.${symbol}`], 'linear').catch((err) => { console.log(err) });

// wsSymbol.subscribeV5([`kline.3.${symbol}`], 'linear').catch((err) => { console.log(err) });
// wsSymbol.subscribeV5([`kline.5.${symbol}`], 'linear').catch((err) => { console.log(err) });
// wsSymbol.subscribeV5([`kline.15.${symbol}`], 'linear').catch((err) => { console.log(err) });


async function Digit(symbol) {// proScale
    let PScale = []
    await client.getInstrumentsInfo({
        category: 'linear',
        symbol: symbol,
    })
        .then((response) => {
            PScale.push(response.result.list[0].priceScale)
            //console.log(PScale)
        })
        .catch((error) => {
            console.error(error);
        });
    return PScale
}

const handleSubmitOrder = ({
    symbol,
    position,
    qty,
    price,
    TPNewReverse = false
}) => {
    client
        .submitOrder({
            category: 'linear',
            symbol,
            side: position === "Long" && !TPNewReverse ? 'Buy' : "Sell",
            orderType: 'Limit',
            qty,
            price,
        })
        .then((response) => {
            if (response.retCode === 0) {
                console.log("Ordered successful")
                orderID = response.result.orderId
            }
            else {
                console.log("Ordered failed", response)
            }

        })
        .catch((error) => {
            console.error(error);
        });
}

const handleCancelOrder = () => {
    client
        .cancelOrder({
            category: 'linear',
            symbol: symbol,
            orderId: orderID,
        })
        .then((response) => {
            if (response.retCode === 0) {
                console.log('Cancel order successful');
                orderID = ''
            }
        })
        .catch((error) => {
            console.error(error);
        });

}

const dataCoinBE = {
    Position: "Long",
    Amount: 100,
    OC: 2.5,
    Candle: "1M",
    Extended: 80,
    TP: 50
}

wsSymbol.on('update', async (dataCoin) => {

    const coinOpen = +dataCoin.data[0].open
    const digit = digitDefault || await Digit(symbol);


    if (dataCoin.topic === "order") {
        // Khớp lệnh
        if (dataCoin.data[0].orderStatus === "Filled") {
            // Send telegram
            const TPNew = (coinOpen + coinOpen * (100 - dataCoinBE.TP) / 100).toFixed(digit)

            const qty = (10 / +TPNew).toFixed(0)

            const dataInput = {
                symbol,
                position: dataCoinBE.Position,
                qty,
                price: TPNew.toFixed(digit),
                TPNewReverse: true,
            }

            handleSubmitOrder(dataInput)
        }
    }

    if (dataCoin.topic.indexOf(`kline.1.${symbol}`) != -1) {

        if (dataCoin.data[0].confirm == false) {

            const coinCurrent = +dataCoin.data[0].close


            const conditionOrder = (coinOpen - coinOpen * dataCoinBE.OC * (dataCoinBE.Extended / 100) / 100).toFixed(digit)
            const priceOrder = (coinOpen - coinOpen * dataCoinBE.OC / 100)

            const qty = (10 / +priceOrder).toFixed(0)

            const dataInput = {
                symbol,
                position: dataCoinBE.Position,
                qty,
                price: priceOrder.toFixed(digit),
            }

            !orderID && +conditionOrder <= coinCurrent && handleSubmitOrder(dataInput)

        }
        else {
            handleCancelOrder()
        }

    }

})

wsSymbol.on('close', () => {
    handleCancelOrder()
    orderID = ""
    console.log('Connection closed');
});
//Báo lỗi socket
wsSymbol.on('error', (err) => {
    handleCancelOrder()
    orderID = ""
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
