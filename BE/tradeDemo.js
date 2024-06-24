const { RestClientV5, WebsocketClient } = require('bybit-api');
const { getAllStrategiesActive } = require('./controllers/dataCoinByBit');

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
    enable_time_sync: true,

}

const wsSymbol = new WebsocketClient(wsConfig);

const strategiesList = [
    {
        id: "id1",
        PositionSide: "Long",
        Amount: 100,
        OrderChange: 0.3,
        Candlestick: "1M",
        TakeProfit: 80,
        ReduceTakeProfit: 45,
        ExtendedOCPercent: 80,
        Ignore: 85,
        EntryTrailing: null,
        StopLose: 50,
        IsActive: true,
        // new Data
        symbol: "1000BEERUSDT",
        digit: 0,
        coinOpen: 0
    },
    {
        id: "id2",
        PositionSide: "Short",
        Amount: 100,
        OrderChange: 0.3,
        Candlestick: "1M",
        TakeProfit: 80,
        ReduceTakeProfit: 45,
        ExtendedOCPercent: 80,
        Ignore: 85,
        EntryTrailing: null,
        StopLose: 50,
        IsActive: true,
        // new Data
        symbol: "1000BEERUSDT",
        digit: 0,
    },
    // {
    //     id: "id3",
    //     PositionSide: "Long",
    //     Amount: 100,
    //     OrderChange: 0.3,
    //     Candlestick: "1M",
    //     TakeProfit: 80,
    //     ReduceTakeProfit: 45,
    //     ExtendedOCPercent: 80,
    //     Ignore: 85,
    //     EntryTrailing: null,
    //     StopLose: 50,
    //     IsActive: true,
    //     // new Data
    //     symbol: "LISTAUSDT",
    //     digit: 0,
    //     coinOpen: 0
    // },
    // {
    //     id: "id4",
    //     PositionSide: "Short",
    //     Amount: 100,
    //     OrderChange: 0.3,
    //     Candlestick: "1M",
    //     TakeProfit: 80,
    //     ReduceTakeProfit: 45,
    //     ExtendedOCPercent: 80,
    //     Ignore: 85,
    //     EntryTrailing: null,
    //     StopLose: 50,
    //     IsActive: true,
    //     // new Data
    //     symbol: "LISTAUSDT",
    //     digit: 0,
    // }
]

const tradeCoinItemDataDefault = {
    "OC": {
        orderID: "",
        orderingStatus: false,
        orderFilled: false
    },
    "TP": {
        orderID: "",
        orderFilled: false,
        orderingStatus: false,
        price: 0,
        qty: 0
    },
    pricePre: {
        open: 0,
        close: 0,
        high: 0,
        low: 0,
    }

};

const tradeCoinData = strategiesList.reduce((pre, cur) => {
    pre[cur.id] = tradeCoinItemDataDefault
    return pre; // Return the accumulator
}, {});

// ------------------------------------------------------
const listSymbol = [
    "1000BEERUSDT",
    "LISTAUSDT"
]

let listSub = listSymbol.map(item => `kline.1.${item}`)
listSub = listSub.concat(["order"])


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

const cancelAll = (strategyID) => {
    tradeCoinData[strategyID] = tradeCoinItemDataDefault
}

const handleSubmitOrder = ({
    strategyID,
    symbol,
    qty,
    side,
    price,
}) => {
    tradeCoinData[strategyID].OC.orderingStatus = true
    console.log(`\n[~] Ordering OC ( ${side} - ${strategyID} - ${price} )... `)
    client
        .submitOrder({
            category: 'linear',
            symbol,
            side,
            positionIdx: 0,
            orderType: 'Limit',
            qty,
            price,
        })
        .then((response) => {
            if (response.retCode == 0) {
                console.log(`[+] Order OC ( ${side} - ${strategyID} - ${price} ) successful `)
                tradeCoinData[strategyID].OC.orderID = response.result.orderId
            }
            else {
                console.log(`[!] Ordered OC ( ${side} - ${strategyID} - ${price} ) failed `, response)
            }
            tradeCoinData[strategyID].OC.orderingStatus = false

        })
        .catch((error) => {
            console.log(`[!] Ordered OC ( ${side} - ${strategyID} - ${price} ) error `, error)
            tradeCoinData[strategyID].OC.orderingStatus = false
        });
}

const handleSubmitOrderTP = ({
    strategyID,
    symbol,
    side,
    qty,
    price,
}) => {
    tradeCoinData[strategyID].TP.orderingStatus = true
    client
        .submitOrder({
            category: 'linear',
            symbol,
            side,
            positionIdx: 0,
            orderType: 'Limit',
            qty,
            price,
        })
        .then((response) => {
            if (response.retCode == 0) {
                console.log(`[+] Order TP ( ${side} ) successful: ${response.result.orderId} `)
                // console.log("TP Order ID first: " + response.result.orderId);
                tradeCoinData[strategyID].TP.orderID = response.result.orderId
            }
            else {
                console.log("[!] Order TP failed ", response)
            }
            tradeCoinData[strategyID].TP.orderingStatus = false

        })
        .catch((error) => {
            console.log("[!] Order TP error ", error)
            tradeCoinData[strategyID].TP.orderingStatus = false
        });
}

const moveOrderTP = ({
    strategyID,
    symbol,
    price,
    orderId
}) => {

    console.log("[~] Moving TP...");
    tradeCoinData[strategyID].TP.orderingStatus = true
    client
        .amendOrder({
            category: 'linear',
            symbol,
            price,
            orderId
        })
        .then((response) => {
            if (response.retCode == 0) {
                console.log(`[->] Move Order TP successful `)
                tradeCoinData[strategyID].TP.orderID = response.result.orderId
            }
            else {
                console.log("[!] Move Order TP failed ", response)
            }
            tradeCoinData[strategyID].TP.orderingStatus = false

        })
        .catch((error) => {
            console.log("[!] Move Order TP error ", error)
            tradeCoinData[strategyID].TP.orderingStatus = false
        });

}

const handleMoveOrderTP = ({
    strategyID,
    strategy,
    coinOpen
}) => {

    const TPOld = tradeCoinData[strategyID].TP.price

    let TPNew
    if (strategy.PositionSide == "Long") {
        TPNew = TPOld - Math.abs(TPOld - coinOpen) * (strategy.ReduceTakeProfit / 100)
    }
    else {
        TPNew = TPOld + Math.abs(TPOld - coinOpen) * (strategy.ReduceTakeProfit / 100)
    }

    tradeCoinData[strategyID].TP.price = TPNew

    const qty = tradeCoinData[strategyID].TP.qty

    // console.log("price",dataMain.price);
    // console.log("avgPrice",dataMain.avgPrice);
    // console.log("openTrade",openTrade);
    // console.log("TPNew",TPNew);

    const dataInput = {
        strategyID,
        symbol: strategy.symbol,
        price: TPNew.toFixed(strategy.digit),
        orderId: tradeCoinData[strategyID].TP.orderID
    }

    moveOrderTP(dataInput)
}
const handleCancelOrder = ({
    strategyID,
    symbol
}) => {
    client
        .cancelOrder({
            category: 'linear',
            symbol,
            orderId: tradeCoinData[strategyID].OC.orderID,
        })
        .then((response) => {
            if (response.retCode == 0) {
                console.log('[V] Cancel order successful ');
                cancelAll(strategyID)
            }
            else {
                console.log('[!] Cancel order failed ', response);
            }
        })
        .catch((error) => {
            console.log('[!] Cancel order error ', error);
        });

}


const handleGetAllStrategiesActive = async () => {
    const result = await getAllStrategiesActive()
    console.log(result);
}




const Main = () => {


    // const strategyID = `${strategy.id}-${strategy.symbol}`;
    // wsSymbol.subscribeV5([], "linear").catch((err) => { console.log(err) });
    // wsSymbol.subscribeV5(["order"], 'linear').catch((err) => { console.log(err)})

    wsSymbol.subscribeV5(listSub, 'linear').then(() => {
        console.log("[V] Subscribe successful");

        strategiesList.forEach(async strategy => {
            wsSymbol.on('update', async (dataCoin) => {

                const strategyID = strategy.id;

                strategy.digit = strategy.digit || await Digit(strategy.symbol);



                if (dataCoin.topic.indexOf(`kline.1.${strategy.symbol}`) != -1) {

                    const coinOpen = +dataCoin.data[0].open
                    const dataMain = dataCoin.data[0]

                    if (dataMain.confirm == false) {

                        if (!tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderingStatus) {

                            const coinCurrent = +dataMain.close

                            const side = strategy.PositionSide == "Long" ? "Buy" : "Sell"
                            let conditionOrder = 0
                            let priceOrder = 0

                            // Check pre coin type 

                            let coinPreCoin = ""
                            let conditionPre = true

                            const pricePreData = tradeCoinData[strategyID].pricePre
                            if (pricePreData.close > pricePreData.open) {
                                coinPreCoin = "Sell"
                            }
                            else {
                                coinPreCoin = "Buy"
                            }
                            // BUY
                            if (side == "Buy") {
                                priceOrder = (coinOpen - coinOpen * strategy.OrderChange / 100)

                                if (coinPreCoin === "Sell") {
                                    const preValue = pricePreData.high - pricePreData.open
                                    const currentValue = coinCurrent - coinOpen
                                    conditionPre = currentValue >= (strategy.Ignore / 100) * preValue
                                }
                                conditionOrder = (coinOpen - coinOpen * (strategy.OrderChange / 100) * (strategy.ExtendedOCPercent / 100)).toFixed(strategy.digit) && conditionPre

                            }
                            else {
                                // SELL
                                if (coinPreCoin === "Buy") {
                                    const preValue = pricePreData.open - pricePreData.low
                                    const currentValue = coinCurrent - coinOpen
                                    conditionPre = currentValue >= (strategy.Ignore / 100) * preValue
                                }
                                conditionOrder = (coinOpen + coinOpen * (strategy.OrderChange / 100) * (strategy.ExtendedOCPercent / 100)).toFixed(strategy.digit) && conditionPre
                                priceOrder = (coinOpen + coinOpen * strategy.OrderChange / 100)
                            }

                            const qty = (5 / +priceOrder).toFixed(0)

                            const dataInput = {
                                strategyID,
                                symbol: strategy.symbol,
                                qty,
                                side,
                                price: priceOrder.toFixed(strategy.digit),
                            }

                            if (side == "Buy") {
                                +conditionOrder >= coinCurrent && (coinOpen - coinCurrent) > 0 && handleSubmitOrder(dataInput)
                            }
                            else {
                                // SELL
                                +conditionOrder <= coinCurrent && (coinOpen - coinCurrent) < 0 && handleSubmitOrder(dataInput)
                            }
                        }

                    }
                    // Coin CLosed
                    else if (dataMain.confirm == true) {
                        const data = dataCoin.data[0]

                        const coinClose = +data.close

                        tradeCoinData[strategyID].pricePre = {
                            open: +data.open,
                            close: +data.close,
                            high: +data.high,
                            low: +data.low,
                        }

                        // TP chưa khớp -> Dịch TP mới
                        if (tradeCoinData[strategyID].TP.orderID && !tradeCoinData[strategyID].TP.orderingStatus) {
                            handleMoveOrderTP({
                                strategyID,
                                strategy,
                                coinOpen: coinClose
                            })
                        }

                        // console.log(` New Candle ${strategy.PositionSide} `)
                        tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderFilled && handleCancelOrder(
                            {
                                strategyID,
                                symbol: strategy.symbol
                            }
                        )
                    }


                }

                // Check khớp lệnh -> Create new Order with TP
                if (dataCoin.topic == "order") {
                    const dataMain = dataCoin.data[0]
                    const orderID = dataCoin.data[0].orderId

                    // console.log(`dataCoin : ${dataMain.orderStatus} / ${dataMain.side} / ${dataMain.orderId} `);

                    if (dataMain.orderStatus == "Filled") {
                        // Khớp OC
                        if (orderID == tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].TP.orderingStatus) {
                            console.log(`[V] Filled OC ( ${strategy.PositionSide == "Long" ? "Buy" : "Sell"} ) `);
                            tradeCoinData[strategyID].OC.orderFilled = true

                            if (!tradeCoinData[strategyID].TP.orderID) {

                                const openTrade = +dataMain.avgPrice  //Gia khop lenh

                                let TPNew = 0

                                if (strategy.PositionSide == "Long") {
                                    TPNew = openTrade + (openTrade * strategy.OrderChange / 100) * (strategy.TakeProfit / 100)
                                }
                                else {
                                    TPNew = openTrade - (openTrade * strategy.OrderChange / 100) * (strategy.TakeProfit / 100)
                                }

                                tradeCoinData[strategyID].TP.price = TPNew

                                const qty = dataMain.qty

                                tradeCoinData[strategyID].TP.qty = qty


                                // console.log("price",dataMain.price);
                                // console.log("avgPrice",dataMain.avgPrice);
                                // console.log("openTrade",openTrade);
                                // console.log("TPNew",TPNew);

                                const dataInput = {
                                    strategyID,
                                    symbol: strategy.symbol,
                                    qty,
                                    price: TPNew.toFixed(strategy.digit),
                                    side: strategy.PositionSide == "Long" ? "Sell" : "Buy",
                                }

                                handleSubmitOrderTP(dataInput)
                            }


                            // Send telegram

                            // 
                        }
                        // Khớp TP
                        else if (orderID == tradeCoinData[strategyID].TP.orderID) {
                            console.log(`[V] Filled TP ( ${strategy.PositionSide == "Long" ? "Sell" : "Buy"} )`);
                            cancelAll(strategyID)
                        }

                    }
                    // if (dataMain.orderStatus == "Cancelled") {
                    //     // Khớp TP
                    //     if (orderID == tradeCoinData[strategyID].TP.orderID) {
                    //         console.log(`[-] Cancel TP ( ${strategy.PositionSide == "Long" ? "Sell" : "Buy"} ) - Chốt lời `);
                    //         // cancelAll(strategyID)
                    //     }
                    // }

                }


            })

            wsSymbol.on('close', () => {
                console.log('Connection closed');
                wsSymbol.unsubscribe(listSub, "linear")
            });

            wsSymbol.on('reconnected', () => {
                console.log('Reconnected successful')
            });

            wsSymbol.on('error', (err) => {
                console.log('Connection error');
                console.error(err);
            });

        })
    }).catch((err) => { console.log("[!] Subscribe error:", err) })
}

Main()