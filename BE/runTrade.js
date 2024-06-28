
require('dotenv').config();

const { Telegraf } = require('telegraf');
const { RestClientV5, WebsocketClient } = require('bybit-api');
const { getAllStrategiesActive, getAllSymbolBE, getFutureBE } = require('./controllers/dataCoinByBit');
const { getBotApiByBotIDBE } = require('./controllers/botApi');

const BOT_TOKEN_RUN_TRADE = new Telegraf(process.env.BOT_TOKEN_RUN_TRADE);
const CHANNEL_ID_RUN_TRADE = process.env.CHANNEL_ID_RUN_TRADE

BOT_TOKEN_RUN_TRADE.launch()

// const API_KEY = "8Ttfa29X5wkjaGSa0P"
// const SECRET_KEY = "uLkFZbyooomB6FMwwlJOHWjgscbpIK4CgRFw"

const clientDigit = new RestClientV5({
    testnet: false,
});

let missTPDataBySymbol = {}

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

const handleSubmitOrder = ({
    tradeCoinData,
    strategyID,
    symbol,
    qty,
    side,
    price,
    candle,
    ApiKey,
    SecretKey
}) => {

    const client = new RestClientV5({
        testnet: false,
        key: ApiKey,
        secret: SecretKey,
    });
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
            if (response.retCode == 0) {
                console.log(`\n[+OC] Order OC ( ${side} - ${symbol} - ${candle} ) successful `)
                tradeCoinData[strategyID].OC.orderID = response.result.orderId
            }
            else {
                console.log(`\n[!] Ordered OC ( ${side} - ${symbol} - ${candle} ) failed: `, response.retMsg)
            }
            tradeCoinData[strategyID].OC.orderingStatus = false

        })
        .catch((error) => {
            console.log(`\n[!] Ordered OC ( ${side} - ${symbol} - ${candle} ) error `, error)
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
    candle = "",
    ApiKey,
    SecretKey,
    missState = false
}) => {
    tradeCoinData[strategyID].TP.orderingStatus = true

    const client = new RestClientV5({
        testnet: false,
        key: ApiKey,
        secret: SecretKey,
    });
    client
        .submitOrder({
            category: 'linear', symbol,
            side,
            positionIdx: 0,
            orderType: 'Limit',
            qty,
            price,
        })
        .then((response) => {
            if (response.retCode == 0) {
                console.log(`[+TP] Order TP ( ${side} - ${symbol} - ${candle} ) successful `)
                tradeCoinData[strategyID].TP.orderID = response.result.orderId
                missTPDataBySymbol[symbol] = {
                    size: missTPDataBySymbol[symbol].size + Math.abs(qty),
                    Candlestick: candle,
                    timeOutFunc: missTPDataBySymbol[symbol].timeOutFunc,
                    sizeTotal: missTPDataBySymbol[symbol].sizeTotal,
                }
            }
            else {
                console.log(`[!] Order TP ( ${side} - ${symbol} - ${candle} ) failed `, response)
                tradeCoinData[strategyID].TP.orderingStatus = false
                if (missState) {
                    console.log(`[X] Không thể xử lý MISS ( ${side} - ${symbol} - ${candle} )`);
                }
            }
        })
        .catch((error) => {
            console.log(`[!] Order TP ( ${side} - ${symbol} - ${candle} ) error `, error)
            tradeCoinData[strategyID].TP.orderingStatus = false
            if (missState) {
                console.log(`[X] Không thể xử lý MISS ( ${side} - ${symbol} - ${candle} )`);
            }
        });
}

const moveOrderTP = ({
    tradeCoinData,
    strategyID,
    symbol,
    price,
    orderId,
    candle,
    ApiKey,
    SecretKey
}) => {
    const client = new RestClientV5({
        testnet: false,
        key: ApiKey,
        secret: SecretKey,
    });
    client
        .amendOrder({
            category: 'linear',
            symbol,
            price,
            orderId
        })
        .then((response) => {
            if (response.retCode == 0) {
                console.log(`[->] Move Order TP ( ${symbol} - ${candle} ) successful`)
                tradeCoinData[strategyID].TP.orderID = response.result.orderId
            }
            else {
                console.log(`[!] Move Order TP ( ${symbol} - ${candle} ) failed `, response)
                tradeCoinData[strategyID].TP.orderID = ""
            }
        })
        .catch((error) => {
            console.log(`[!] Move Order TP ( ${symbol} - ${candle} ) error `, error)
            tradeCoinData[strategyID].TP.orderID = ""
        });

}

const handleMoveOrderTP = ({
    tradeCoinData,
    strategyID,
    strategy,
    coinOpen,
    candle = "",
    ApiKey,
    SecretKey
}) => {

    if (tradeCoinData[strategyID].TP.orderID) {

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
            candle,
            ApiKey,
            SecretKey
        }
        moveOrderTP(dataInput)
    }
}

const handleCancelOrder = ({
    tradeCoinData,
    strategyID,
    symbol,
    candle = "",
    orderId,
    side,
    ApiKey,
    SecretKey
}) => {
    const client = new RestClientV5({
        testnet: false,
        key: ApiKey,
        secret: SecretKey,
    });
    if (tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderFilled) {
        client
            .cancelOrder({
                category: 'linear',
                symbol,
                orderId,
            })
            .then((response) => {
                if (response.retCode == 0) {
                    console.log(`[V] Cancel order ( ${side} -  ${symbol} - ${candle} ) successful `);
                }
                else {
                    console.log(`[!] Cancel order ( ${side} -  ${symbol} - ${candle} ) failed `, response);
                }
                cancelAll({ tradeCoinData, strategyID })
            })
            .catch((error) => {
                console.log(`[!] Cancel order ( ${side} -  ${symbol} - ${candle} ) error `, error);
                cancelAll({ tradeCoinData, strategyID })
            });
    }

}

const handleCancelOrderTP = ({
    tradeCoinData,
    strategyID,
    symbol,
    candle = "",
    orderId,
    ApiKey,
    SecretKey
}) => {
    const client = new RestClientV5({
        testnet: false,
        key: ApiKey,
        secret: SecretKey,
    });
    client
        .cancelOrder({
            category: 'linear',
            symbol,
            orderId,
        })
        .then((response) => {
            if (response.retCode == 0) {
                console.log(`[V] Cancel vị thế ( ${symbol} - ${candle} ) successful `);
            }
            else {
                console.log(`[!] Cancel vị thế ( ${symbol} - ${candle} ) failed `, response);
            }
            cancelAll({ tradeCoinData, strategyID })
        })
        .catch((error) => {
            console.log(`[!] Cancel vị thế ( ${symbol} - ${candle} ) error `, error);
            cancelAll({ tradeCoinData, strategyID })
        });

}

const resetMissData = (symbol) => {
    missTPDataBySymbol[symbol] = {
        size: 0,
        Candlestick: "",
        timeOutFunc: "",
        sizeTotal: 0
    }
}

const cancelAll = (
    {
        tradeCoinData,
        strategyID,
    }
) => {
    tradeCoinData[strategyID] = {
        "OC": {
            orderID: "",
            orderingStatus: false,
            orderFilled: false,
            openTrade: ""
        },
        "TP": {
            orderID: "",
            orderFilled: false,
            orderingStatus: false,
            price: 0,
            qty: 0
        },
        pricePre: tradeCoinData[strategyID].pricePre
    }
}

// 
const sendMessageWithRetry = async (messageText, retries = 5) => {
    for (let i = 0; i < retries; i++) {
        try {
            messageText && await BOT_TOKEN_RUN_TRADE.telegram.sendMessage(CHANNEL_ID_RUN_TRADE, messageText);
            return;
        } catch (error) {
            if (error.code === 429) {
                const retryAfter = error.parameters.retry_after;
                console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            } else {
                throw error;
            }
        }
    }
    throw new Error('Failed to send message after multiple retries');
}


// -----------------------------------------
const Main = async () => {


    const wsConfig = {
        market: 'v5',
        enable_time_sync: true,
    }

    const wsSymbol = new WebsocketClient(wsConfig);

    let allStrategiesActiveBE = getAllStrategiesActive()
    let allSymbolBE = getAllSymbolBE()

    const result = await Promise.all([allStrategiesActiveBE, allSymbolBE])

    const allStrategiesActiveResult = result[0]
    const allSymbol = result[1]

    // 
    let allStrategiesActiveObject = allStrategiesActiveResult.flatMap((data) => data.children.map(child => ({
        ...child,
        symbol: data.value,
        value: `${data._id}-${child._id}`
    }))) || []

    // const allStrategiesActive = allStrategiesActiveObject.reduce((pre, cur) => {
    //     pre[cur.value] = cur
    //     return pre
    // }, {})

    let allStrategies1m = []
    let allStrategies3m = []
    let allStrategies5m = []
    let allStrategies15m = []

    let allSymbolAndCandle = []
    let allBotID = []



    allStrategiesActiveObject.forEach(strategyItem => {
        let Candlestick = strategyItem.Candlestick
        let symbol = strategyItem.symbol
        let data = {
            symbol,
            Candlestick
        }
        if (Candlestick === "1m") {
            allStrategies1m.push(strategyItem)
        }
        else if (Candlestick === "3m") {
            allStrategies3m.push(strategyItem)
        }
        else if (Candlestick === "5m") {
            allStrategies5m.push(strategyItem)
        }
        else if (Candlestick === "15m") {
            allStrategies15m.push(strategyItem)
        }
        // !allSymbolAndCandle.find(item => item.symbol === data.symbol && item.Candlestick === data.Candlestick) && allSymbolAndCandle.push(data)
        !allBotID.find(item => item === strategyItem.botID._id) && allBotID.push(strategyItem.botID._id)
        resetMissData(symbol)
    })

    // 
    let digitAllCoinObject = {}

    const resultAll = await Promise.allSettled([
        Promise.all(allBotID.map(async botID => getBotApiByBotIDBE(botID))),
        Promise.all(allBotID.map(async botID => getFutureBE(botID))),
    ])

    let botApiList = []
    let botApiListObject = {}
    let botAmountListObject = {}

    if (resultAll[0]?.value?.length > 0) {
        resultAll[0]?.value.forEach(botApiData => {
            const data = {
                ApiKey: botApiData.ApiKey,
                SecretKey: botApiData.SecretKey,
            }
            botApiListObject[botApiData.botID._id] = data
            botApiList.push(data)
        })
    }

    if (resultAll[1]?.value?.length > 0) {
        resultAll[1]?.value.forEach(data => {
            botAmountListObject[data.botID] = +data.totalWalletBalance
        })
    }

    await Promise.all(allSymbol.map(async symbol => {
        let result = await Digit(symbol)
        digitAllCoinObject[symbol] = result[0]
    }))

    // let listKline = allSymbolAndCandle.map(candleItem => `kline.${candleItem.Candlestick.slice(0, -1)}.${candleItem.symbol}`)
    let listKline = allSymbol.flatMap(candleItem => ([
        `kline.1.${candleItem}`,
        `kline.3.${candleItem}`,
        `kline.5.${candleItem}`,
        `kline.15.${candleItem}`,
    ]))
    let listOrder = ["order", "position"]

    let tradeCoinData = allStrategiesActiveObject.reduce((pre, cur) => {
        pre[cur.value] = {
            "OC": {
                orderID: "",
                orderingStatus: false,
                orderFilled: false,
                openTrade: ""
            },
            "TP": {
                orderID: "",
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

        }
        return pre; // Return the accumulator
    }, {});

    // 
    wsSymbol.subscribeV5(listKline, 'linear').then(() => {

        wsSymbol.on('update', (dataCoin) => {
            allStrategies1m.forEach(strategy => {
                const strategyID = strategy.value

                strategy.digit = digitAllCoinObject[strategy.symbol]

                const topic = dataCoin.topic
                const symbol = topic.split(".").slice(-1)?.[0]


                if (topic === `kline.1.${symbol}`) {

                    if (strategy.symbol === symbol) {

                        const dataMain = dataCoin.data[0]
                        const coinOpen = +dataMain.open

                        const botID = strategy.botID._id

                        const ApiKey = botApiListObject[botID].ApiKey
                        const SecretKey = botApiListObject[botID].SecretKey
                        const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"

                        if (dataMain.confirm == false) {

                            if (!tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderingStatus) {

                                const coinCurrent = +dataMain.close

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
                                        const currentValue = coinOpen - coinCurrent
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

                                const qty = (botAmountListObject[botID] * strategy.Amount / 100 / +priceOrder).toFixed(0)

                                const dataInput = {
                                    ApiKey,
                                    SecretKey,
                                    tradeCoinData,
                                    strategyID,
                                    symbol: strategy.symbol,
                                    qty,
                                    side,
                                    price: priceOrder.toFixed(strategy.digit),
                                    candle: "1m",

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

                            // console.log("Move", tradeCoinData[strategyID].TP.orderID);
                            if (tradeCoinData[strategyID].TP.orderID) {
                                handleMoveOrderTP({
                                    ApiKey,
                                    SecretKey,
                                    tradeCoinData,
                                    strategyID,
                                    strategy,
                                    candle: strategy.Candlestick,
                                    coinOpen: coinClose
                                })
                            }

                            // console.log(` New Candle ${strategy.PositionSide} `)
                            tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderFilled && handleCancelOrder(
                                {
                                    tradeCoinData,
                                    strategyID,
                                    symbol: strategy.symbol,
                                    orderId: tradeCoinData[strategyID].OC.orderID,
                                    candle: strategy.Candlestick,
                                    side,
                                    ApiKey,
                                    SecretKey,
                                }
                            )
                        }
                    }

                }

            })

            allStrategies3m.forEach(strategy => {
                const strategyID = strategy.value

                const topic = dataCoin.topic
                const symbol = topic.split(".").slice(-1)?.[0]

                if (topic === `kline.3.${symbol}`) {

                    if (strategy.symbol === symbol) {

                        const dataMain = dataCoin.data[0]
                        const coinOpen = +dataMain.open

                        strategy.digit = digitAllCoinObject[strategy.symbol]

                        const botID = strategy.botID._id

                        const ApiKey = botApiListObject[botID].ApiKey
                        const SecretKey = botApiListObject[botID].SecretKey


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
                                        const currentValue = coinOpen - coinCurrent
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

                                const qty = (botAmountListObject[botID] * strategy.Amount / 100 / +priceOrder).toFixed(0)

                                const dataInput = {
                                    ApiKey,
                                    SecretKey,
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

                            // console.log("Move", tradeCoinData[strategyID].TP.orderID);
                            if (tradeCoinData[strategyID].TP.orderID) {
                                handleMoveOrderTP({
                                    ApiKey,
                                    SecretKey,
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
                                    symbol: strategy.symbol,
                                    orderId: tradeCoinData[strategyID].OC.orderID,
                                    candle: strategy.Candlestick,
                                    ApiKey,
                                    SecretKey,
                                }
                            )
                        }
                    }

                }

            })

            allStrategies5m.forEach(strategy => {
                const strategyID = strategy.value

                const topic = dataCoin.topic
                const symbol = topic.split(".").slice(-1)?.[0]

                if (topic === `kline.5.${symbol}`) {

                    if (strategy.symbol === symbol) {

                        const dataMain = dataCoin.data[0]
                        const coinOpen = +dataMain.open

                        strategy.digit = digitAllCoinObject[strategy.symbol]

                        const botID = strategy.botID._id

                        const ApiKey = botApiListObject[botID].ApiKey
                        const SecretKey = botApiListObject[botID].SecretKey

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
                                        const currentValue = coinOpen - coinCurrent
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

                                const qty = (botAmountListObject[botID] * strategy.Amount / 100 / +priceOrder).toFixed(0)

                                const dataInput = {
                                    ApiKey,
                                    SecretKey,
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

                            // console.log("Move", tradeCoinData[strategyID].TP.orderID);
                            if (tradeCoinData[strategyID].TP.orderID) {
                                handleMoveOrderTP({
                                    ApiKey,
                                    SecretKey,
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
                                    symbol: strategy.symbol,
                                    orderId: tradeCoinData[strategyID].OC.orderID,
                                    candle: strategy.Candlestick,
                                    ApiKey,
                                    SecretKey,
                                }
                            )
                        }
                    }

                }

            })

            allStrategies15m.forEach(strategy => {
                const strategyID = strategy.value

                const topic = dataCoin.topic
                const symbol = topic.split(".").slice(-1)?.[0]

                if (topic === `kline.15.${symbol}`) {

                    if (strategy.symbol === symbol) {

                        const dataMain = dataCoin.data[0]
                        const coinOpen = +dataMain.open

                        strategy.digit = digitAllCoinObject[strategy.symbol]

                        const botID = strategy.botID._id

                        const ApiKey = botApiListObject[botID].ApiKey
                        const SecretKey = botApiListObject[botID].SecretKey

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
                                        const currentValue = coinOpen - coinCurrent
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

                                const qty = (botAmountListObject[botID] * strategy.Amount / 100 / +priceOrder).toFixed(0)

                                const dataInput = {
                                    ApiKey,
                                    SecretKey,
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

                            // console.log("Move", tradeCoinData[strategyID].TP.orderID);
                            if (tradeCoinData[strategyID].TP.orderID) {
                                handleMoveOrderTP({
                                    ApiKey,
                                    SecretKey,
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
                                    symbol: strategy.symbol,
                                    orderId: tradeCoinData[strategyID].OC.orderID,
                                    candle: strategy.Candlestick,
                                    ApiKey,
                                    SecretKey,
                                }
                            )
                        }
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
    }).catch(err => {
        console.log("[V] Subscribe kline error:", err);
    })


    // ORDER

    botApiList.map(botApiData => {

        const ApiKey = botApiData.ApiKey
        const SecretKey = botApiData.SecretKey

        const wsConfigOrder = {
            key: ApiKey,
            secret: SecretKey,
            market: 'v5',
            enable_time_sync: true,
        }

        const wsOrder = new WebsocketClient(wsConfigOrder);

        const botID = botApiData._id

        wsOrder.subscribeV5(listOrder, 'linear').catch(err => {
            console.log(`[V] Subscribe order ${botID} error:`, err);
        })

        wsOrder.on('update', async (dataCoin) => {
            allStrategiesActiveObject.forEach(strategy => {
                const strategyID = strategy.value

                const dataMain = dataCoin.data[0]
                const symbol = dataMain.symbol
                const orderID = dataMain.orderId

                if (strategy.symbol === symbol) {

                    if (dataCoin.topic === "order") {
                        if (dataMain.orderStatus === "Filled") {
                            // Khớp OC
                            // if (orderID === tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].TP.orderingStatus) {

                            if (orderID === tradeCoinData[strategyID].OC.orderID) {
                                tradeCoinData[strategyID].OC.orderFilled = true

                                // Send telegram
                                const openTrade = +dataMain.avgPrice  //Gia khop lenh

                                tradeCoinData[strategyID].OC.openTrade = openTrade

                                const sideText = strategy.PositionSide === "Long" ? "Buy" : "Sell"
                                const botName = strategy.botID.botName

                                const qty = dataMain.qty
                                const priceOldOrder = +qty * +dataMain.price


                                console.log(`[V] Filled OC: \n${symbol} | Open ${sideText} \nBot: ${botName} \nFutures: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% | TP: ${strategy.TakeProfit}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}`);
                                const teleText = `${symbol} | Open ${sideText} \nBot: ${botName} \nFutures: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% | TP: ${strategy.TakeProfit}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}`
                                sendMessageWithRetry(teleText)
                                // 

                                if (!tradeCoinData[strategyID].TP.orderID && !tradeCoinData[strategyID].TP.orderingStatus) {


                                    let TPNew = 0

                                    if (strategy.PositionSide === "Long") {
                                        TPNew = openTrade + (openTrade * strategy.OrderChange / 100) * (strategy.TakeProfit / 100)
                                    }
                                    else {
                                        TPNew = openTrade - (openTrade * strategy.OrderChange / 100) * (strategy.TakeProfit / 100)
                                    }

                                    tradeCoinData[strategyID].TP.price = TPNew


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
                                        candle: strategy.Candlestick,
                                        ApiKey,
                                        SecretKey
                                    }

                                    handleSubmitOrderTP(dataInput)
                                }


                                // Send telegram

                                // 
                            }
                            // Khớp TP
                            else if (orderID === tradeCoinData[strategyID].TP.orderID) {

                                const closePrice = +dataMain.avgPrice

                                const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"
                                const botName = strategy.botID.botName

                                const openTradeOCFilled = tradeCoinData[strategyID].OC.openTrade

                                const qty = +dataMain.qty
                                const priceOldOrder = qty * +dataMain.price

                                console.log(`[V] Filled TP: \n${symbol} | Close ${side} \nBot: ${botName} \nFutures: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% | TP: ${strategy.TakeProfit}% \nPrice: ${closePrice} | Amount: ${strategy.Amount}`);
                                const teleText = `${symbol} | Close ${side} \nBot: ${botName} \nFutures: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% | TP: ${strategy.TakeProfit}% \nPrice: ${closePrice} | Amount: ${priceOldOrder}`


                                const priceWinPercent = ((closePrice - openTradeOCFilled) / openTradeOCFilled * 100).toFixed(2);
                                const priceWin = ((closePrice - openTradeOCFilled) * qty).toFixed(2);

                                let textWinLose = ""

                                if (side === "Buy") {
                                    if (priceWin > 0 && priceWinPercent > 0) {
                                        textWinLose = `[WIN - Buy]: ${priceWin} | ${priceWinPercent}`
                                        console.log(textWinLose);
                                    }
                                    else {
                                        textWinLose = `[LOSE - Buy]: ${priceWin} | ${priceWinPercent}`
                                        console.log(textWinLose);
                                    }
                                }
                                else {
                                    if (priceWin > 0 && priceWinPercent > 0) {
                                        textWinLose = `[LOSE - SELL]: ${-1 * priceWin} | ${priceWinPercent}`
                                        console.log(textWinLose);
                                    }
                                    else {
                                        textWinLose = `[WIN - SELL]: ${Math.abs(priceWin)} | ${priceWinPercent}`
                                        console.log(textWinLose);
                                    }
                                }

                                if (missTPDataBySymbol[symbol].sizeTotal == qty) {
                                    console.log("[RESET] Reset Miss");
                                    resetMissData(symbol)
                                    cancelAll({ tradeCoinData, strategyID })
                                }
                                else {
                                    missTPDataBySymbol[symbol].size -= Math.abs(qty)
                                }

                                sendMessageWithRetry(`${teleText} \n${textWinLose}`)

                            }
                            // User cancel vị thế
                            if (dataMain.orderType === "Market" && tradeCoinData[strategyID].TP.orderID) {
                                handleCancelOrderTP(
                                    {
                                        tradeCoinData,
                                        strategyID,
                                        symbol: strategy.symbol,
                                        orderId: tradeCoinData[strategyID].TP.orderID,
                                        candle: strategy.Candlestick,
                                        ApiKey,
                                        SecretKey
                                    }
                                )
                            }
                        }
                        else if (dataMain.orderStatus === "Cancelled") {
                            // console.log("[X] Cancelled");
                            // Khớp TP
                            if (orderID === tradeCoinData[strategyID].TP.orderID) {
                                console.log(`[-] Cancelled TP ( ${strategy.PositionSide === "Long" ? "Sell" : "Buy"} - ${symbol} - ${strategy.Candlestick} ) - Chốt lời `);
                                // cancelAll({ tradeCoinData, strategyID, symbol })
                            }
                            else if (orderID === tradeCoinData[strategyID].OC.orderID) {
                                console.log(`[-] Cancelled OC ( ${strategy.PositionSide === "Long" ? "Sell" : "Buy"} - ${symbol} - ${strategy.Candlestick}) `);
                                cancelAll({ tradeCoinData, strategyID })
                            }

                        }
                    }

                    else if (dataCoin.topic === "position") {
                        const size = Math.abs(dataMain.size)

                        if (size > 0 && strategy.Candlestick === missTPDataBySymbol[symbol].Candlestick) {

                            const missSize = size - missTPDataBySymbol[symbol].size

                            missTPDataBySymbol[symbol].sizeTotal = size

                            missTPDataBySymbol[symbol].timeOutFunc && clearTimeout(missTPDataBySymbol[symbol].timeOutFunc)

                            if (missSize > 0) {
                                missTPDataBySymbol[symbol].timeOutFunc = setTimeout(() => {
                                    if (!tradeCoinData[strategyID].TP.orderID && !tradeCoinData[strategyID].TP.orderingStatus) {

                                        console.log(`[_ MISS _] TP ( ${dataMain.side} - ${symbol} - ${strategy.Candlestick} ): ${missSize}`);

                                        const openTrade = +dataMain.entryPrice  //Gia khop lenh

                                        let TPNew = 0

                                        if (strategy.PositionSide === "Long") {
                                            TPNew = openTrade + (openTrade * strategy.OrderChange / 100) * (strategy.TakeProfit / 100)
                                        }
                                        else {
                                            TPNew = openTrade - (openTrade * strategy.OrderChange / 100) * (strategy.TakeProfit / 100)
                                        }

                                        tradeCoinData[strategyID].TP.price = TPNew

                                        const dataInput = {
                                            tradeCoinData,
                                            strategyID,
                                            symbol: strategy.symbol,
                                            qty: missSize.toString(),
                                            price: TPNew.toFixed(strategy.digit),
                                            side: dataMain.side === " Buy" ? "Sell" : "Buy",
                                            candle: strategy.Candlestick,
                                            ApiKey,
                                            SecretKey,
                                            missState: true
                                        }
                                        console.log("[Re-TP] Order TP Miss");
                                        handleSubmitOrderTP(dataInput)
                                    }
                                }, 1000)

                            }
                            else {
                                console.log(`[_ Not Miss _] TP ( ${dataMain.side} - ${symbol} - ${strategy.Candlestick} )`);
                            }
                        }
                    }
                }
            })
        })

        wsOrder.on('close', () => {
            console.log('Connection order closed');
            wsOrder.unsubscribe(listOrder, "linear")
        });

        wsOrder.on('reconnected', () => {
            console.log('Reconnected order successful')
        });

        wsOrder.on('error', (err) => {
            console.log('Connection order error');
            console.error(err);
        });
    })

}

Main()