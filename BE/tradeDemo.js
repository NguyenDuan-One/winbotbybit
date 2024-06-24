const { RestClientV5, WebsocketClient } = require('bybit-api');
const { getAllStrategiesActive, getAllSymbolBE } = require('./controllers/dataCoinByBit');


const client = new RestClientV5({
    testnet: false,
    key: 'foRfrB7L1GgXt1Ly5O',
    secret: 'zxbzLknpNW0k1i2Ze8UFtQq2HEK4tgVqFjgp',
    enable_time_sync: true,
});

const clientDigit = new RestClientV5({
    testnet: false,
});

async function Digit(symbol) {// proScale
    let PScale = []
    await clientDigit.getInstrumentsInfo({
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

const cancelAll = (
    {
        tradeCoinData,
        strategyID
    }
) => {
    tradeCoinData[strategyID] = {
        "OC": {
            orderID: "",
            orderingStatus: false,
            orderFilled: false
        },
        "TP": {
            orderID: "",
            orderFilled: false,
            // orderingStatus: false,
            price: 0,
            qty: 0
        },
        pricePre: {
            open: 0,
            close: 0,
            high: 0,
            low: 0,
        }

    }
}

const handleSubmitOrder = ({
    tradeCoinData,
    strategyID,
    symbol,
    qty,
    side,
    price,
    candle
}) => {
    tradeCoinData[strategyID].OC.orderingStatus = true
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
            if (response.retCode === 0) {
                console.log(`[+OC] Order OC ( ${side} - ${symbol} - ${candle} ) successful `)
                tradeCoinData[strategyID].OC.orderID = response.result?.orderId
            }
            else {
                console.log(`[!] Ordered OC ( ${side} - ${symbol} - ${candle} ) failed `, response)
            }
            tradeCoinData[strategyID].OC.orderingStatus = false

        })
        .catch((error) => {
            console.log(`[!] Ordered OC ( ${side} - ${symbol} - ${candle} ) error `, error)
            tradeCoinData[strategyID].OC.orderingStatus = false
        });
}

const handleSubmitOrderTP = ({
    tradeCoinData,
    strategyID,
    symbol,
    side,
    qty,
    price,
    candle = ""
}) => {
    // tradeCoinData[strategyID].TP.orderingStatus = true
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
            if (response.retCode === 0) {
                console.log(`[+TP] Order TP ( ${side} - ${symbol} - ${candle} ) successful `)
                tradeCoinData[strategyID].TP.orderID = response.result?.orderId
                // console.log("TP Order ID first: " + response.result?.orderId);
            }
            else {
                console.log(`[!] Order TP ( ${side} - ${symbol} - ${candle} ) failed `, response)
            }
            // tradeCoinData[strategyID].TP.orderingStatus = false

        })
        .catch((error) => {
            console.log(`[!] Order TP ( ${side} - ${symbol} - ${candle} ) error `, error)
            // tradeCoinData[strategyID].TP.orderingStatus = false
        });
}

const moveOrderTP = ({
    tradeCoinData,
    strategyID,
    symbol,
    price,
    orderId,
    candle
}) => {

    console.log("[~] Moving TP...");
    // tradeCoinData[strategyID].TP.orderingStatus = true
    client
        .amendOrder({
            category: 'linear',
            symbol,
            price,
            orderId
        })
        .then((response) => {
            if (response.retCode === 0) {
                console.log(`[->] Move Order TP ( ${symbol} - ${candle} ) successful `)
                tradeCoinData[strategyID].TP.orderID = response.result?.orderId
            }
            else {
                console.log(`[!] Move Order TP ( ${symbol} - ${candle} ) failed `, response)
            }
            // tradeCoinData[strategyID].TP.orderingStatus = false

        })
        .catch((error) => {
            console.log(`[!] Move Order TP ( ${symbol} - ${candle} ) error `, error)
            // tradeCoinData[strategyID].TP.orderingStatus = false
        });

}

const handleMoveOrderTP = ({
    tradeCoinData,
    strategyID,
    strategy,
    coinOpen,
    candle = ""
}) => {

    const TPOld = tradeCoinData[strategyID].TP.price

    let TPNew
    if (strategy.PositionSide === "Long") {
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
        tradeCoinData,
        symbol: strategy.symbol,
        price: TPNew.toFixed(strategy.digit),
        orderId: tradeCoinData[strategyID].TP.orderID,
        candle
    }

    moveOrderTP(dataInput)
}

const handleCancelOrder = ({
    tradeCoinData,
    strategyID,
    symbol,
    candle = ""
}) => {
    client
        .cancelOrder({
            category: 'linear',
            symbol,
            orderId: tradeCoinData[strategyID].OC.orderID,
        })
        .then((response) => {
            if (response.retCode === 0) {
                console.log(`[V] Cancel order ( ${symbol} - ${candle} ) successful `);
                cancelAll({ tradeCoinData, strategyID })
            }
            else {
                console.log(`[!] Cancel order ( ${symbol} - ${candle} ) failed `, response);
            }
        })
        .catch((error) => {
            console.log(`[!] Cancel order ( ${symbol} - ${candle} ) error `, error);
        });

}

// -----------------------------------------
const Main = async () => {


    const wsConfig = {
        market: 'v5',
        enable_time_sync: true,
    }
    const wsConfigOrder = {
        key: 'foRfrB7L1GgXt1Ly5O',
        secret: 'zxbzLknpNW0k1i2Ze8UFtQq2HEK4tgVqFjgp',
        market: 'v5',
        enable_time_sync: true,
    }

    const wsSymbol = new WebsocketClient(wsConfig);
    const wsOrder = new WebsocketClient(wsConfigOrder);


    const allStrategiesActiveResult = await getAllStrategiesActive()



    // 
    const allStrategiesActive = allStrategiesActiveResult.flatMap((data) => data.children.map(child => ({
        ...child,
        symbol: data.value,
    })))

    const allSymbolAndCandle = []


    allStrategiesActive.forEach(strategyItem => {

        const symbol = strategyItem.symbol

        const data = {
            symbol,
            Candlestick: strategyItem.Candlestick
        }

        !allSymbolAndCandle.find(item => item.symbol === data.symbol && item.Candlestick === data.Candlestick) && allSymbolAndCandle.push(data)
    })

    // 
    const digitAllCoinObject = {}

    await Promise.all(allSymbolAndCandle.map(async item => {
        const symbol = item.symbol
        const result = await Digit(symbol)
        digitAllCoinObject[symbol] = result[0]
    }))

    // 
    const listKline = allSymbolAndCandle.map(candleItem => `kline.${candleItem.Candlestick.slice(0, -1)}.${candleItem.symbol}`)
    // const listOrder = ["order"]

    const tradeCoinData = allStrategiesActive.reduce((pre, cur) => {
        pre[`${cur._id}-${cur.symbol}-${cur.Candlestick}`] = {
            "OC": {
                orderID: "",
                orderingStatus: false,
                orderFilled: false
            },
            "TP": {
                orderID: "",
                orderFilled: false,
                price: 0,
                qty: 0
            },
            pricePre: {
                open: 0,
                close: 0,
                high: 0,
                low: 0,
            }

        }
        return pre; // Return the accumulator
    }, {});

    wsSymbol.subscribeV5(listKline, 'linear').then(() => {
        console.log("[V] Subscribe successful");

        wsSymbol.on('update', async (dataCoin) => {
            allStrategiesActive.forEach(async strategy => {

                const strategyID = `${strategy._id}-${strategy.symbol}-${strategy.Candlestick}`;

                strategy.digit = digitAllCoinObject[strategy.symbol]

                if (dataCoin.topic.indexOf(`kline.1.${strategy.symbol}`) != -1) {

                    const coinOpen = +dataCoin.data[0].open
                    const dataMain = dataCoin.data[0]

                    if (dataMain.confirm == false) {

                        if (!tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderingStatus) {

                            const coinCurrent = +dataMain.close

                            const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"
                            let conditionOrder = 0
                            let priceOrder = 0

                            // Check pre coin type 

                            let coinPreCoin = ""
                            let conditionPre = true

                            const pricePreData = tradeCoinData[strategyID].pricePre
                            if (pricePreData.close > pricePreData.open) {
                                coinPreCoin = "Blue"
                            }
                            else {
                                coinPreCoin = "Red"
                            }
                            // BUY
                            if (side === "Buy") {
                                priceOrder = (coinOpen - coinOpen * strategy.OrderChange / 100)

                                if (coinPreCoin === "Blue") {
                                    const preValue = pricePreData.high - pricePreData.open
                                    const currentValue = coinCurrent - coinOpen
                                    conditionPre = currentValue >= (strategy.Ignore / 100) * preValue
                                }
                                conditionOrder = (coinOpen - coinOpen * (strategy.OrderChange / 100) * (strategy.ExtendedOCPercent / 100)).toFixed(strategy.digit)

                            }
                            else {
                                // SELL
                                if (coinPreCoin === "Red") {
                                    const preValue = pricePreData.open - pricePreData.low
                                    const currentValue = coinCurrent - coinOpen
                                    conditionPre = currentValue >= (strategy.Ignore / 100) * preValue
                                }
                                conditionOrder = (coinOpen + coinOpen * (strategy.OrderChange / 100) * (strategy.ExtendedOCPercent / 100)).toFixed(strategy.digit)
                                priceOrder = (coinOpen + coinOpen * strategy.OrderChange / 100)
                            }

                            const qty = (5 / +priceOrder).toFixed(0)

                            const dataInput = {
                                tradeCoinData,
                                strategyID,
                                symbol: strategy.symbol,
                                qty,
                                side,
                                price: priceOrder.toFixed(strategy.digit),
                                candle: "1m"
                            }

                            if (side === "Buy") {
                                +conditionOrder >= coinCurrent && (coinOpen - coinCurrent) > 0 && conditionPre && handleSubmitOrder(dataInput)
                            }
                            else {
                                // SELL
                                +conditionOrder <= coinCurrent && (coinOpen - coinCurrent) < 0 && conditionPre && handleSubmitOrder(dataInput)
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
                        // if (tradeCoinData[strategyID].TP.orderID && !tradeCoinData[strategyID].TP.orderingStatus) {

                        if (tradeCoinData[strategyID].TP.orderID) {
                            handleMoveOrderTP({
                                tradeCoinData,
                                strategyID,
                                strategy,
                                coinOpen: coinClose
                            })
                        }

                        // console.log(` New Candle ${strategy.PositionSide} `)
                        tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderFilled && handleCancelOrder(
                            {
                                tradeCoinData,
                                strategyID,
                                symbol: strategy.symbol
                            }
                        )
                    }


                }

                if (dataCoin.topic.indexOf(`kline.3.${strategy.symbol}`) != -1) {

                    const coinOpen = +dataCoin.data[0].open
                    const dataMain = dataCoin.data[0]

                    if (dataMain.confirm == false) {

                        if (!tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderingStatus) {

                            const coinCurrent = +dataMain.close

                            const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"
                            let conditionOrder = 0
                            let priceOrder = 0

                            // Check pre coin type 

                            let coinPreCoin = ""
                            let conditionPre = true

                            const pricePreData = tradeCoinData[strategyID].pricePre
                            if (pricePreData.close > pricePreData.open) {
                                coinPreCoin = "Blue"
                            }
                            else {
                                coinPreCoin = "Red"
                            }
                            // BUY
                            if (side === "Buy") {
                                priceOrder = (coinOpen - coinOpen * strategy.OrderChange / 100)

                                if (coinPreCoin === "Blue") {
                                    const preValue = pricePreData.high - pricePreData.open
                                    const currentValue = coinCurrent - coinOpen
                                    conditionPre = currentValue >= (strategy.Ignore / 100) * preValue
                                }
                                conditionOrder = (coinOpen - coinOpen * (strategy.OrderChange / 100) * (strategy.ExtendedOCPercent / 100)).toFixed(strategy.digit)

                            }
                            else {
                                // SELL
                                if (coinPreCoin === "Red") {
                                    const preValue = pricePreData.open - pricePreData.low
                                    const currentValue = coinCurrent - coinOpen
                                    conditionPre = currentValue >= (strategy.Ignore / 100) * preValue
                                }
                                conditionOrder = (coinOpen + coinOpen * (strategy.OrderChange / 100) * (strategy.ExtendedOCPercent / 100)).toFixed(strategy.digit)
                                priceOrder = (coinOpen + coinOpen * strategy.OrderChange / 100)
                            }

                            const qty = (5 / +priceOrder).toFixed(0)

                            const dataInput = {
                                tradeCoinData,
                                strategyID,
                                symbol: strategy.symbol,
                                qty,
                                side,
                                price: priceOrder.toFixed(strategy.digit),
                                candle: "3m"
                            }

                            if (side === "Buy") {
                                +conditionOrder >= coinCurrent && (coinOpen - coinCurrent) > 0 && conditionPre && handleSubmitOrder(dataInput)
                            }
                            else {
                                // SELL
                                +conditionOrder <= coinCurrent && (coinOpen - coinCurrent) < 0 && conditionPre && handleSubmitOrder(dataInput)
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
                        // if (tradeCoinData[strategyID].TP.orderID && !tradeCoinData[strategyID].TP.orderingStatus) {

                        if (tradeCoinData[strategyID].TP.orderID) {
                            handleMoveOrderTP({
                                tradeCoinData,
                                strategyID,
                                strategy,
                                coinOpen: coinClose
                            })
                        }

                        // console.log(` New Candle ${strategy.PositionSide} `)
                        tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderFilled && handleCancelOrder(
                            {
                                tradeCoinData,
                                strategyID,
                                symbol: strategy.symbol
                            }
                        )
                    }


                }

                if (dataCoin.topic.indexOf(`kline.5.${strategy.symbol}`) != -1) {

                    const coinOpen = +dataCoin.data[0].open
                    const dataMain = dataCoin.data[0]

                    if (dataMain.confirm == false) {

                        if (!tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderingStatus) {

                            const coinCurrent = +dataMain.close

                            const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"
                            let conditionOrder = 0
                            let priceOrder = 0

                            // Check pre coin type 

                            let coinPreCoin = ""
                            let conditionPre = true

                            const pricePreData = tradeCoinData[strategyID].pricePre
                            if (pricePreData.close > pricePreData.open) {
                                coinPreCoin = "Blue"
                            }
                            else {
                                coinPreCoin = "Red"
                            }
                            // BUY
                            if (side === "Buy") {
                                priceOrder = (coinOpen - coinOpen * strategy.OrderChange / 100)

                                if (coinPreCoin === "Blue") {
                                    const preValue = pricePreData.high - pricePreData.open
                                    const currentValue = coinCurrent - coinOpen
                                    conditionPre = currentValue >= (strategy.Ignore / 100) * preValue
                                }
                                conditionOrder = (coinOpen - coinOpen * (strategy.OrderChange / 100) * (strategy.ExtendedOCPercent / 100)).toFixed(strategy.digit)

                            }
                            else {
                                // SELL
                                if (coinPreCoin === "Red") {
                                    const preValue = pricePreData.open - pricePreData.low
                                    const currentValue = coinCurrent - coinOpen
                                    conditionPre = currentValue >= (strategy.Ignore / 100) * preValue
                                }
                                conditionOrder = (coinOpen + coinOpen * (strategy.OrderChange / 100) * (strategy.ExtendedOCPercent / 100)).toFixed(strategy.digit)
                                priceOrder = (coinOpen + coinOpen * strategy.OrderChange / 100)
                            }

                            const qty = (5 / +priceOrder).toFixed(0)

                            const dataInput = {
                                tradeCoinData,
                                strategyID,
                                symbol: strategy.symbol,
                                qty,
                                side,
                                price: priceOrder.toFixed(strategy.digit),
                                candle: "5m"
                            }

                            if (side === "Buy") {
                                +conditionOrder >= coinCurrent && (coinOpen - coinCurrent) > 0 && conditionPre && handleSubmitOrder(dataInput)
                            }
                            else {
                                // SELL
                                +conditionOrder <= coinCurrent && (coinOpen - coinCurrent) < 0 && conditionPre && handleSubmitOrder(dataInput)
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
                        // if (tradeCoinData[strategyID].TP.orderID && !tradeCoinData[strategyID].TP.orderingStatus) {

                        if (tradeCoinData[strategyID].TP.orderID) {
                            handleMoveOrderTP({
                                tradeCoinData,
                                strategyID,
                                strategy,
                                coinOpen: coinClose
                            })
                        }

                        // console.log(` New Candle ${strategy.PositionSide} `)
                        tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderFilled && handleCancelOrder(
                            {
                                tradeCoinData,
                                strategyID,
                                symbol: strategy.symbol
                            }
                        )
                    }


                }

                if (dataCoin.topic.indexOf(`kline.15.${strategy.symbol}`) != -1) {

                    const coinOpen = +dataCoin.data[0].open
                    const dataMain = dataCoin.data[0]

                    if (dataMain.confirm == false) {

                        if (!tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderingStatus) {

                            const coinCurrent = +dataMain.close

                            const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"
                            let conditionOrder = 0
                            let priceOrder = 0

                            // Check pre coin type 

                            let coinPreCoin = ""
                            let conditionPre = true

                            const pricePreData = tradeCoinData[strategyID].pricePre
                            if (pricePreData.close > pricePreData.open) {
                                coinPreCoin = "Blue"
                            }
                            else {
                                coinPreCoin = "Red"
                            }
                            // BUY
                            if (side === "Buy") {
                                priceOrder = (coinOpen - coinOpen * strategy.OrderChange / 100)

                                if (coinPreCoin === "Blue") {
                                    const preValue = pricePreData.high - pricePreData.open
                                    const currentValue = coinCurrent - coinOpen
                                    conditionPre = currentValue >= (strategy.Ignore / 100) * preValue
                                }
                                conditionOrder = (coinOpen - coinOpen * (strategy.OrderChange / 100) * (strategy.ExtendedOCPercent / 100)).toFixed(strategy.digit)

                            }
                            else {
                                // SELL
                                if (coinPreCoin === "Red") {
                                    const preValue = pricePreData.open - pricePreData.low
                                    const currentValue = coinCurrent - coinOpen
                                    conditionPre = currentValue >= (strategy.Ignore / 100) * preValue
                                }
                                conditionOrder = (coinOpen + coinOpen * (strategy.OrderChange / 100) * (strategy.ExtendedOCPercent / 100)).toFixed(strategy.digit)
                                priceOrder = (coinOpen + coinOpen * strategy.OrderChange / 100)
                            }

                            const qty = (5 / +priceOrder).toFixed(0)

                            const dataInput = {
                                tradeCoinData,
                                strategyID,
                                symbol: strategy.symbol,
                                qty,
                                side,
                                price: priceOrder.toFixed(strategy.digit),
                                candle: "15m"
                            }

                            if (side === "Buy") {
                                +conditionOrder >= coinCurrent && (coinOpen - coinCurrent) > 0 && conditionPre && handleSubmitOrder(dataInput)
                            }
                            else {
                                // SELL
                                +conditionOrder <= coinCurrent && (coinOpen - coinCurrent) < 0 && conditionPre && handleSubmitOrder(dataInput)
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
                        // if (tradeCoinData[strategyID].TP.orderID && !tradeCoinData[strategyID].TP.orderingStatus) {

                        if (tradeCoinData[strategyID].TP.orderID) {
                            handleMoveOrderTP({
                                tradeCoinData,
                                strategyID,
                                strategy,
                                coinOpen: coinClose
                            })
                        }

                        // console.log(` New Candle ${strategy.PositionSide} `)
                        tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderFilled && handleCancelOrder(
                            {
                                tradeCoinData,
                                strategyID,
                                symbol: strategy.symbol
                            }
                        )
                    }


                }


            })
        })

        wsSymbol.on('close', () => {
            console.log('Connection listKline closed');
            wsSymbol.unsubscribe(listKline, "linear")
        });

        wsSymbol.on('reconnected', () => {
            console.log('Reconnected listKline successful')
        });

        wsSymbol.on('error', (err) => {
            console.log('Connection listKline error');
            console.error(err);
        });


    }).catch((err) => { console.log("[!] Subscribe error:", err) })

    wsOrder.subscribeV5(["order"], 'linear').then(() => {

        wsOrder.on('update', async (dataCoin) => {
            allStrategiesActive.forEach(async strategy => {

                const strategyID = `${strategy._id}-${strategy.symbol}-${strategy.Candlestick}`;

                // Check khớp lệnh -> Create new Order with TP
                if (dataCoin.topic === "order") {

                    const dataMain = dataCoin.data[0]
                    const orderID = dataCoin.data[0].orderId


                    // console.log("___ Order ___", dataMain.orderStatus);
                    // console.log(`dataCoin : ${dataMain.orderStatus} / ${dataMain.side} / ${dataMain.orderId} `);

                    if (dataMain?.orderStatus === "Filled") {
                        // Khớp OC
                        // if (orderID === tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].TP.orderingStatus) {
                        if (orderID === tradeCoinData[strategyID].OC.orderID) {
                            console.log(`[V] Filled OC ( ${strategy.PositionSide === "Long" ? "Buy" : "Sell"} ) `);
                            tradeCoinData[strategyID].OC.orderFilled = true

                            if (!tradeCoinData[strategyID].TP.orderID) {

                                const openTrade = +dataMain.avgPrice  //Gia khop lenh

                                let TPNew = 0

                                if (strategy.PositionSide === "Long") {
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
                                    tradeCoinData,
                                    strategyID,
                                    symbol: strategy.symbol,
                                    qty,
                                    price: TPNew.toFixed(strategy.digit),
                                    side: strategy.PositionSide === "Long" ? "Sell" : "Buy",
                                }

                                handleSubmitOrderTP(dataInput)
                            }


                            // Send telegram

                            // 
                        }
                        // Khớp TP
                        else if (orderID === tradeCoinData[strategyID].TP.orderID) {
                            console.log(`[V] Filled TP ( ${strategy.PositionSide === "Long" ? "Sell" : "Buy"} )`);
                            cancelAll({ tradeCoinData, strategyID })
                        }

                    }
                    if (dataMain.orderStatus === "Cancelled") {
                        // Khớp TP
                        if (orderID === tradeCoinData[strategyID].TP.orderID) {
                            console.log(`[-] Cancel TP ( ${strategy.PositionSide === "Long" ? "Sell" : "Buy"} ) - Chốt lời `);
                            tradeCoinData[strategyID] = {
                                ...tradeCoinData[strategyID],
                                "TP": {
                                    orderID: "",
                                    orderFilled: false,
                                    // orderingStatus: false,
                                    price: 0,
                                    qty: 0
                                },
                            }
                        }
                        if (orderID === tradeCoinData[strategyID].OC.orderID) {
                            console.log(`[-] Cancel OC ( ${strategy.PositionSide === "Long" ? "Sell" : "Buy"} ) `);
                            tradeCoinData[strategyID] = {
                                ...tradeCoinData[strategyID],
                                "OC": {
                                    orderID: "",
                                    orderingStatus: false,
                                    orderFilled: false
                                },
                            }
                        }

                    }

                }
            })
        })
        wsOrder.on('close', () => {
            console.log('Connection order closed');
            wsOrder.unsubscribe(["order"], "linear")
        });

        wsOrder.on('reconnected', () => {
            console.log('Reconnected order successful')
        });

        wsOrder.on('error', (err) => {
            console.log('Connection order error');
            console.error(err);
        });
    }).catch((err) => { console.log("[!] Subscribe error:", err) })
}

Main()