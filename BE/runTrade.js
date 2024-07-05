
require('dotenv').config();

const { Telegraf } = require('telegraf');
const { RestClientV5, WebsocketClient } = require('bybit-api');
const { getAllStrategiesActive, getAllSymbolBE, getFutureBE } = require('./controllers/dataCoinByBit');
const { createPositionBE, updatePositionBE, deletePositionBE } = require('./controllers/position');

const StrategiesModel = require("./models/strategies.model")

const BOT_TOKEN_RUN_TRADE = new Telegraf(process.env.BOT_TOKEN_RUN_TRADE);
const CHANNEL_ID_RUN_TRADE = process.env.CHANNEL_ID_RUN_TRADE

const LIST_ORDER = ["order", "position"]

BOT_TOKEN_RUN_TRADE.launch()

process.once('SIGINT', () => BOT_TOKEN_RUN_TRADE.stop('SIGINT'))
process.once('SIGTERM', () => BOT_TOKEN_RUN_TRADE.stop('SIGTERM'))


// const API_KEY = "8Ttfa29X5wkjaGSa0P"
// const SECRET_KEY = "uLkFZbyooomB6FMwwlJOHWjgscbpIK4CgRFw"

const clientDigit = new RestClientV5({
    testnet: false,
});

// ----------------------------------------------------------------------------------
let missTPDataBySymbol = {}

var listKline = []

var allStrategies1m = {}
var allStrategies3m = {}
var allStrategies5m = {}
var allStrategies15m = {}
var tradeCoinData = {}
var allStrategiesActiveByBotID = {}
var allSymbolDataObject = {}
var botApiList = {}
var digitAllCoinObject = {}
var botAmountListObject = {}


// ----------------------------------------------------------------------------------

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
                missTPDataBySymbol[symbol].Candlestick = candle
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
                const newOrderID = response.result.orderId
                missTPDataBySymbol[symbol] = {
                    ...missTPDataBySymbol[symbol],
                    size: missTPDataBySymbol[symbol].size + Math.abs(qty),
                    Candlestick: candle,
                }
                if (!missState) {
                    tradeCoinData[strategyID].TP.orderID = newOrderID
                }
                else {
                    missTPDataBySymbol[symbol].orderID = newOrderID
                }

            }
            else {
                console.log(`[!] Order TP ( ${side} - ${symbol} - ${candle} ) failed `, response)
                tradeCoinData[strategyID].TP.orderingStatus = false
                if (missState) {
                    console.log(`[X] Không thể xử lý MISS ( ${side} - ${symbol} - ${candle} )`);
                    console.log(`[_UPDATE MISS_] Position ( ${side} - ${symbol} - ${candle} )`);
                    updatePositionBE({
                        newDataUpdate: {
                            Miss: true
                        },
                        orderID: missTPDataBySymbol[symbol].orderIDToDB
                    }).then(message => {
                        console.log(message);
                    }).catch(err => {
                        console.log(err);
                    })
                }
            }
        })
        .catch((error) => {
            console.log(`[!] Order TP ( ${side} - ${symbol} - ${candle} ) error `, error)
            tradeCoinData[strategyID].TP.orderingStatus = false
            if (missState) {
                console.log(`[X] Không thể xử lý MISS ( ${side} - ${symbol} - ${candle} )`);
                console.log(`[_UPDATE MISS_] Position ( ${side} - ${symbol} - ${candle} )`);
                updatePositionBE({
                    newDataUpdate: {
                        Miss: true
                    },
                    orderID: missTPDataBySymbol[symbol].orderIDToDB
                }).then(message => {
                    console.log(message);
                }).catch(err => {
                    console.log(err);
                })
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

const handleCancelOrderOC = ({
    tradeCoinData,
    strategyID,
    symbol,
    candle = "",
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
                orderId: tradeCoinData[strategyID].OC.orderID,
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
    side,
    candle = "",
    orderId,
    ApiKey,
    SecretKey,
    gongLai = false
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
                console.log(`[V] Cancel Vị Thế ( ${side} - ${symbol} - ${candle} ) successful `);
                if (missTPDataBySymbol[symbol]?.orderIDToDB) {
                }
                if (gongLai) {
                    missTPDataBySymbol[symbol].gongLai = true
                }
                // else {
                //     console.log(`[_DELETE_] Position ( ${side} - ${symbol} - ${candle} )`);
                //     missTPDataBySymbol[symbol].orderIDToDB && deletePositionBE({
                //         orderID: missTPDataBySymbol[symbol].orderIDToDB
                //     }).then(message => {
                //         console.log(message);
                //     }).catch(err => {
                //         console.log(err);
                //     })
                // }
            }
            else {
                console.log(`[!] Cancel Vị Thế ( ${side} - ${symbol} - ${candle} ) failed `, response);
            }
            cancelAll({ tradeCoinData, strategyID })
        })
        .catch((error) => {
            console.log(`[!] Cancel Vị Thế ( ${side} - ${symbol} - ${candle} ) error `, error);
            cancelAll({ tradeCoinData, strategyID })
        });

}

const resetMissData = (symbol) => {
    missTPDataBySymbol[symbol] = {
        size: 0,
        Candlestick: "",
        timeOutFunc: "",
        sizeTotal: 0,
        orderIDToDB: "",
        orderID: "",
        gongLai: false
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

const handleSocketBotApiList = async (botApiList = {}) => {

    const objectToArray = Object.values(botApiList);
    const objectToArrayLength = objectToArray.length;
    console.log("[Bot-API] botApiList Length:", objectToArrayLength);

    if (objectToArrayLength > 0) {

        const resultGetFuture = await Promise.all(Object.values(botApiList).map(async botData => getFutureBE(botData.id)))

        if (resultGetFuture.length > 0) {
            resultGetFuture.forEach(data => {
                botAmountListObject[data.botID] = +data.totalWalletBalance
            })
        }

        console.log("[...] Subscribe new-bot-list-api successful\n");

        await objectToArray.map(botApiData => {

            const ApiKey = botApiData.ApiKey
            const SecretKey = botApiData.SecretKey

            const wsConfigOrder = {
                key: ApiKey,
                secret: SecretKey,
                market: 'v5',
                enable_time_sync: true
            }

            const wsOrder = new WebsocketClient(wsConfigOrder);

            const botID = botApiData.id

            wsOrder.subscribeV5(LIST_ORDER, 'linear').catch(err => {
                console.log(`[V] Subscribe order ${botID} error:`, err);
            })

            wsOrder.on('update', async (dataCoin) => {
                Object.values(allStrategiesActiveByBotID[botID]).forEach(strategy => {

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

                                    const priceOldOrder = botAmountListObject[strategy.botID._id] * strategy.Amount / 100

                                    missTPDataBySymbol[symbol].Candlestick = strategy.Candlestick

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
                                    const priceOldOrder = botAmountListObject[strategy.botID._id] * strategy.Amount / 100

                                    console.log(`[V] Filled TP: \n${symbol} | Close ${side} \nBot: ${botName} \nFutures: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% | TP: ${strategy.TakeProfit}% \nPrice: ${closePrice} | Amount: ${strategy.Amount}`);
                                    const teleText = `${symbol} | Close ${side} \nBot: ${botName} \nFutures: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% | TP: ${strategy.TakeProfit}% \nPrice: ${closePrice} | Amount: ${priceOldOrder}`

                                    const priceWinPercent = ((closePrice - openTradeOCFilled) / openTradeOCFilled * 100).toFixed(2);
                                    const priceWin = ((closePrice - openTradeOCFilled) * qty).toFixed(2);

                                    let textWinLose = ""

                                    if (side === "Buy") {
                                        if (priceWin > 0 && priceWinPercent > 0) {
                                            textWinLose = `\n=> [WIN - Buy]: ${priceWin} | ${priceWinPercent}%\n`
                                            console.log(textWinLose);
                                        }
                                        else {
                                            textWinLose = `\n=> [LOSE - Buy]: ${priceWin} | ${priceWinPercent}%\n`
                                            console.log(textWinLose);
                                        }
                                    }
                                    else {
                                        if (priceWin > 0 && priceWinPercent > 0) {
                                            textWinLose = `\n=> [LOSE - SELL]: ${-1 * priceWin} | ${priceWinPercent}%\n`
                                            console.log(textWinLose);
                                        }
                                        else {
                                            textWinLose = `\n=> [WIN - SELL]: ${Math.abs(priceWin)} | ${priceWinPercent}%\n`
                                            console.log(textWinLose);
                                        }
                                    }

                                    sendMessageWithRetry(`${teleText} \n${textWinLose}`)

                                    missTPDataBySymbol[symbol].size -= Math.abs(qty)

                                    // Fill toàn bộ
                                    if (missTPDataBySymbol[symbol].sizeTotal == qty || missTPDataBySymbol[symbol].size == 0) {
                                        // 
                                        console.log(`[_FULL Filled_]] Filled TP ( ${side} - ${symbol} - ${strategy.Candlestick} )`);
                                        console.log(`[_DELETE_] Position ( ${side} - ${symbol} - ${strategy.Candlestick} )`);

                                        deletePositionBE({
                                            orderID: missTPDataBySymbol[symbol].orderIDToDB
                                        }).then(message => {
                                            console.log(message);
                                        }).catch(err => {
                                            console.log(err);
                                        })

                                        // Xóa Strategies chưa active hoặc bị xóa

                                        // 
                                        console.log("[...] Reset Miss");
                                        resetMissData(symbol)
                                        cancelAll({ tradeCoinData, strategyID })

                                    }
                                    else {
                                        // 
                                        console.log(`[_UPDATE QTY_] Position ( ${side} - ${symbol} - ${strategy.Candlestick} )`);
                                        updatePositionBE({
                                            newDataUpdate: {
                                                Quantity: missTPDataBySymbol[symbol].size
                                            },
                                            orderID: missTPDataBySymbol[symbol].orderIDToDB
                                        }).then(message => {
                                            console.log(message);
                                        }).catch(err => {
                                            console.log(err);
                                        })
                                    }


                                }
                                // User cancel vị thế
                                if (dataMain.orderType === "Market") {
                                    console.log('[...] User Clicked Close Vị Thế');
                                    if (tradeCoinData[strategyID].TP?.orderID) {
                                        handleCancelOrderTP(
                                            {
                                                tradeCoinData,
                                                strategyID,
                                                symbol: strategy.symbol,
                                                side: strategy.Candlestick,
                                                orderId: tradeCoinData[strategyID].TP.orderID,
                                                candle: strategy.Candlestick,
                                                ApiKey,
                                                SecretKey
                                            }
                                        )
                                    }
                                    if (missTPDataBySymbol[strategy.symbol].TP?.orderID) {
                                        console.log(`[...] Cancel Position MISS`);
                                        handleCancelOrderTP(
                                            {
                                                tradeCoinData,
                                                strategyID,
                                                symbol: strategy.symbol,
                                                side: strategy.Candlestick,
                                                orderId: missTPDataBySymbol[strategy.symbol].TP.orderID,
                                                candle: strategy.Candlestick,
                                                ApiKey,
                                                SecretKey
                                            }
                                        )
                                    }

                                    console.log(`[_DELETE_] Position ( ${side} - ${symbol} - ${candle} )`);
                                    missTPDataBySymbol[symbol].orderIDToDB && deletePositionBE({
                                        orderID: missTPDataBySymbol[symbol].orderIDToDB
                                    }).then(message => {
                                        console.log(message);
                                    }).catch(err => {
                                        console.log(err);
                                    })
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

                                missTPDataBySymbol[symbol].timeOutFunc && clearTimeout(missTPDataBySymbol[symbol].timeOutFunc)

                                missTPDataBySymbol[symbol].timeOutFunc = setTimeout(() => {
                                    const missSize = size - missTPDataBySymbol[symbol].size

                                    missTPDataBySymbol[symbol].sizeTotal = size

                                    const openTrade = +dataMain.entryPrice  //Gia khop lenh

                                    // 
                                    console.log(`\n[_Save DB_] Position ( ${dataMain.side} - ${symbol} - ${strategy.Candlestick} )`);

                                    const Quantity = dataMain.side === "Buy" ? size : (size * -1)

                                    const newDataToDB = {
                                        Symbol: symbol,
                                        Side: dataMain.side,
                                        Quantity,
                                        Price: openTrade,
                                        Pnl: dataMain.unrealisedPnl,
                                    }

                                    if (!missTPDataBySymbol[symbol].orderIDToDB) {

                                        const orderIDToDB = dataCoin.id
                                        missTPDataBySymbol[symbol].orderIDToDB = orderIDToDB

                                        createPositionBE({
                                            ...newDataToDB,
                                            orderID: orderIDToDB,
                                            botID: strategy.botID._id,
                                        }).then(message => {
                                            console.log(message);
                                        }).catch(err => {
                                            console.log(err);
                                        })
                                    }
                                    else {
                                        if (missTPDataBySymbol[symbol].orderIDToDB) {
                                            console.log("[_Re-Update_] Vị Thế");
                                            updatePositionBE({
                                                newDataUpdate: {
                                                    ...newDataToDB,
                                                    Miss: missTPDataBySymbol[symbol].gongLai
                                                },
                                                orderID: missTPDataBySymbol[symbol].orderIDToDB
                                            }).then(message => {
                                                console.log(message);
                                            }).catch(err => {
                                                console.log(err);
                                            })
                                        }
                                    }

                                    if (!missTPDataBySymbol[symbol].gongLai) {
                                        if (missSize > 0) {
                                            if (!tradeCoinData[strategyID].TP.orderingStatus && !strategy.gongLai) {

                                                console.log(`\n[_ MISS _] TP ( ${dataMain.side} - ${symbol} - ${strategy.Candlestick} ): ${missSize}\n`);

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
                                                console.log("[ Re-TP ] Order TP Miss");
                                                handleSubmitOrderTP(dataInput)
                                            }
                                            if (strategy.gongLai) {
                                                console.log(`\n[_ MISS _] TP ( ${dataMain.side} - ${symbol} - ${strategy.Candlestick} ): ${missSize}\n`);
                                                console.log(`[_UPDATE MISS_] Position ( ${dataMain.side} - ${symbol} - ${strategy.Candlestick} )`);
                                                updatePositionBE({
                                                    newDataUpdate: {
                                                        Miss: true
                                                    },
                                                    orderID: missTPDataBySymbol[symbol].orderIDToDB
                                                }).then(message => {
                                                    console.log(message);
                                                }).catch(err => {
                                                    console.log(err);
                                                })
                                            }

                                        }
                                        else {
                                            console.log(`[_ Not Miss _] TP ( ${dataMain.side} - ${symbol} - ${strategy.Candlestick} )`);
                                        }
                                    }

                                }, 1000)
                            }
                        }
                    }
                })
            })

            wsOrder.on('close', () => {
                console.log('Connection order closed');
                wsOrder.unsubscribeV5(LIST_ORDER, "linear")
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
}

// ----------------------------------------------------------------------------------
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const checkConditionBot = (botData) => {
    return botData.botID?.Status === "Running" && botData.botID?.ApiKey && botData.botID?.SecretKey
}

const Main = async () => {


    const wsConfig = {
        market: 'v5',
        enable_time_sync: true,
    }

    const wsSymbol = new WebsocketClient(wsConfig);

    let allStrategiesActiveBE = getAllStrategiesActive()
    let allSymbolBE = getAllSymbolBE()


    const result = await Promise.all([allStrategiesActiveBE, allSymbolBE])

    const allStrategiesActiveObject = result[0]
    const allSymbol = result[1]

    allStrategiesActiveObject.forEach(strategyItem => {
        if (checkConditionBot(strategyItem)) {
            let Candlestick = strategyItem.Candlestick
            let symbol = strategyItem.symbol
            const botID = strategyItem.botID._id
            const strategyID = strategyItem.value

            if (Candlestick === "1m") {
                allStrategies1m[strategyID] = strategyItem
            }
            else if (Candlestick === "3m") {
                allStrategies3m[strategyID] = strategyItem
            }
            else if (Candlestick === "5m") {
                allStrategies5m[strategyID] = strategyItem

            }
            else if (Candlestick === "15m") {
                allStrategies15m[strategyID] = strategyItem
            }

            if (!botApiList[botID]) {
                botApiList[botID] = {
                    id: botID,
                    ApiKey: strategyItem.botID.ApiKey,
                    SecretKey: strategyItem.botID.SecretKey,
                }
            }
            !allStrategiesActiveByBotID[botID] && (allStrategiesActiveByBotID[botID] = {})
            allStrategiesActiveByBotID[botID][strategyID] = strategyItem
            resetMissData(symbol)
        }
    })

    await Promise.all(allSymbol.map(async symbol => {
        let result = await Digit(symbol.value)
        digitAllCoinObject[symbol.value] = result[0]
        allSymbolDataObject[symbol.value] = symbol._id
    }))

    listKline = allSymbol.flatMap(symbolItem => ([
        `kline.1.${symbolItem.value}`,
        `kline.3.${symbolItem.value}`,
        `kline.5.${symbolItem.value}`,
        `kline.15.${symbolItem.value}`,
    ]))


    tradeCoinData = allStrategiesActiveObject.reduce((pre, cur) => {
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

    // KLINE
    wsSymbol.subscribeV5(listKline, 'linear').then(() => {

        console.log("[V] Subscribe kline successful\n");

        wsSymbol.on('update', (dataCoin) => {
            Object.values(allStrategies1m).forEach(strategy => {
                const strategyID = strategy.value

                strategy.digit = digitAllCoinObject[strategy.symbol]

                const topic = dataCoin.topic
                const symbol = topic.split(".").slice(-1)?.[0]


                if (checkConditionBot(strategy)) {
                    if (topic === `kline.1.${symbol}`) {

                        if (strategy.symbol === symbol) {

                            const dataMain = dataCoin.data[0]
                            const coinOpen = +dataMain.open

                            const botID = strategy.botID._id

                            const ApiKey = strategy.botID.ApiKey
                            const SecretKey = strategy.botID.SecretKey
                            const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"

                            if (dataMain.confirm == false) {

                                if (!tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderingStatus && strategy.IsActive) {

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
                                tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderFilled && handleCancelOrderOC(
                                    {
                                        tradeCoinData,
                                        strategyID,
                                        symbol: strategy.symbol,
                                        candle: strategy.Candlestick,
                                        side,
                                        ApiKey,
                                        SecretKey,
                                    }
                                )
                            }
                        }

                    }
                }

            })

            Object.values(allStrategies3m).forEach(strategy => {
                const strategyID = strategy.value

                const topic = dataCoin.topic
                const symbol = topic.split(".").slice(-1)?.[0]

                if (checkConditionBot(strategy)) {

                    if (topic === `kline.3.${symbol}`) {

                        if (strategy.symbol === symbol) {

                            const dataMain = dataCoin.data[0]
                            const coinOpen = +dataMain.open

                            strategy.digit = digitAllCoinObject[strategy.symbol]

                            const botID = strategy.botID._id

                            const ApiKey = strategy.botID.ApiKey
                            const SecretKey = strategy.botID.SecretKey

                            const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"

                            if (dataMain.confirm == false) {

                                if (!tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderingStatus && strategy.IsActive) {

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
                                tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderFilled && handleCancelOrderOC(
                                    {
                                        tradeCoinData,
                                        strategyID,
                                        symbol: strategy.symbol,
                                        candle: strategy.Candlestick,
                                        side,
                                        ApiKey,
                                        SecretKey,
                                    }
                                )
                            }
                        }

                    }
                }

            })

            Object.values(allStrategies5m).forEach(strategy => {
                const strategyID = strategy.value

                const topic = dataCoin.topic
                const symbol = topic.split(".").slice(-1)?.[0]
                if (checkConditionBot(strategy)) {

                    if (topic === `kline.5.${symbol}`) {

                        if (strategy.symbol === symbol) {

                            const dataMain = dataCoin.data[0]
                            const coinOpen = +dataMain.open

                            strategy.digit = digitAllCoinObject[strategy.symbol]

                            const botID = strategy.botID._id

                            const ApiKey = strategy.botID.ApiKey
                            const SecretKey = strategy.botID.SecretKey
                            const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"

                            if (dataMain.confirm == false) {

                                if (!tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderingStatus && strategy.IsActive) {

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
                                tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderFilled && handleCancelOrderOC(
                                    {
                                        tradeCoinData,
                                        strategyID,
                                        symbol: strategy.symbol,
                                        side,
                                        candle: strategy.Candlestick,
                                        ApiKey,
                                        SecretKey,
                                    }
                                )
                            }
                        }

                    }
                }

            })

            Object.values(allStrategies15m).forEach(strategy => {
                const strategyID = strategy.value

                const topic = dataCoin.topic
                const symbol = topic.split(".").slice(-1)?.[0]

                if (checkConditionBot(strategy)) {

                    if (topic === `kline.15.${symbol}`) {

                        if (strategy.symbol === symbol) {

                            const dataMain = dataCoin.data[0]
                            const coinOpen = +dataMain.open

                            strategy.digit = digitAllCoinObject[strategy.symbol]

                            const botID = strategy.botID._id

                            const ApiKey = strategy.botID.ApiKey
                            const SecretKey = strategy.botID.SecretKey
                            const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"

                            if (dataMain.confirm == false) {

                                if (!tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderingStatus && strategy.IsActive) {

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
                                tradeCoinData[strategyID].OC.orderID && !tradeCoinData[strategyID].OC.orderFilled && handleCancelOrderOC(
                                    {
                                        tradeCoinData,
                                        strategyID,
                                        symbol: strategy.symbol,
                                        candle: strategy.Candlestick,
                                        side,
                                        ApiKey,
                                        SecretKey,
                                    }
                                )
                            }
                        }

                    }
                }

            })
        })

        wsSymbol.on('close', () => {
            console.log('[V] Connection listKline closed');
            wsSymbol.unsubscribe(listKline, "linear")
        });

        wsSymbol.on('reconnected', () => {
            console.log('[V] Reconnected listKline successful')
        });

        wsSymbol.on('error', (err) => {
            console.log('[!] Connection listKline error');
            console.error(err);
        });
    }).catch(err => {
        console.log("[!] Subscribe kline error:", err);
    })

    // ORDER
    await handleSocketBotApiList(botApiList)

    // REALTIME
    const socket = require('socket.io-client');

    const socketRealtime = socket('http://localhost:3001');

    socketRealtime.on('connect', () => {
        console.log('[V] Connected Socket Realtime');
    });

    socketRealtime.on('add', async (newData = []) => {
        console.log("[...] Add New Strategies From Realtime", newData.length);

        const newBotApiList = {}

        newData.forEach(newStrategiesData => {
            if (checkConditionBot(newStrategiesData)) {

                delete newStrategiesData.TimeTemp

                const symbol = newStrategiesData.symbol

                const strategyID = newStrategiesData.value

                const botID = newStrategiesData.botID._id

                tradeCoinData[strategyID] = {
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

                const ApiKey = newStrategiesData.botID.ApiKey
                const SecretKey = newStrategiesData.botID.SecretKey

                if (!botApiList[botID]) {
                    botApiList[botID] = {
                        id: botID,
                        ApiKey,
                        SecretKey
                    }
                    newBotApiList[botID] = {
                        id: botID,
                        ApiKey,
                        SecretKey
                    }
                    !allStrategiesActiveByBotID[botID] && (allStrategiesActiveByBotID[botID] = {})
                    allStrategiesActiveByBotID[botID][strategyID] = newStrategiesData
                }


                let allStrategiesTemp = {}

                // kline by Candlestick
                switch (newStrategiesData.Candlestick) {
                    case "1m": {
                        allStrategiesTemp = allStrategies1m
                        break
                    }
                    case "3m": {
                        allStrategiesTemp = allStrategies3m
                        break

                    }
                    case "5m": {
                        allStrategiesTemp = allStrategies5m
                        break

                    }
                    case "15m": {
                        allStrategiesTemp = allStrategies15m
                        break

                    }
                }

                allStrategiesTemp[strategyID] = {
                    ...newStrategiesData,
                    symbol: symbol,
                }
            }

        })



        await handleSocketBotApiList(newBotApiList)

    });

    socketRealtime.on('update', (newData = []) => {
        console.log("[...] Update Strategies From Realtime", newData.length);

        newData.map(async strategiesData => {

            if (checkConditionBot(strategiesData)) {

                const ApiKey = strategiesData.botID.ApiKey
                const SecretKey = strategiesData.botID.SecretKey
                const botID = strategiesData.botID._id

                const symbol = strategiesData.symbol
                const strategyID = strategiesData.value
                const IsActive = strategiesData.IsActive
                const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

                const newStrategiesDataUpdate = { ...strategiesData, symbol: strategiesData.symbol }

                switch (strategiesData.Candlestick) {
                    case "1m": {
                        allStrategies1m[strategiesData.value] = newStrategiesDataUpdate
                        break
                    }
                    case "3m": {
                        allStrategies3m[strategiesData.value] = newStrategiesDataUpdate
                        break

                    }
                    case "5m": {
                        allStrategies5m[strategiesData.value] = newStrategiesDataUpdate
                        break

                    }
                    case "15m": {
                        allStrategies15m[strategiesData.value] = newStrategiesDataUpdate
                        break
                    }
                }

                const cancelDataObject = {
                    ApiKey,
                    SecretKey,
                    tradeCoinData,
                    strategyID,
                    symbol: symbol,
                    candle: strategiesData.Candlestick,
                    side,
                }
                if (IsActive) {
                    !allStrategiesActiveByBotID[botID] && (allStrategiesActiveByBotID[botID] = {})
                    allStrategiesActiveByBotID[botID][strategyID] = strategiesData
                }
                else {
                    delete allStrategiesActiveByBotID[botID]?.[strategyID]
                }

                const OCOrderID = tradeCoinData[strategyID]?.OC?.orderID

                if (OCOrderID || !strategiesData.IsActive) {
                    OCOrderID && handleCancelOrderOC(cancelDataObject)
                    if (!strategiesData.IsActive) {
                        const TPOrderID = tradeCoinData[strategyID]?.TP?.orderID
                        const TPMissOrderID = missTPDataBySymbol[symbol]?.orderID
                        TPOrderID && handleCancelOrderTP({
                            ...cancelDataObject,
                            orderId: TPOrderID,
                            gongLai: true
                        })
                        TPMissOrderID && handleCancelOrderTP({
                            ...cancelDataObject,
                            orderId: TPMissOrderID,
                            gongLai: true
                        })
                    }
                    await delay(500)
                }

            }
        })


    });

    socketRealtime.on('bot-api', (data) => {
        const { newData, botID: botIDMain, newApiData } = data;
        console.log("[...] Update Strategies From Realtime", newData.length);

        newData.map(async strategiesData => {

            if (checkConditionBot(strategiesData)) {
                const strategyID = strategiesData.value
                const symbol = strategiesData.symbol

                const OCOrderID = tradeCoinData[strategyID]?.OC?.orderID
                const TPOrderID = tradeCoinData[strategyID]?.TP?.orderID
                const TPMissOrderID = missTPDataBySymbol[symbol]?.orderID

                if (OCOrderID || TPOrderID || TPMissOrderID) {
                    OCOrderID && handleCancelOrderOC(cancelDataObject)


                    TPOrderID && handleCancelOrderTP({
                        ...cancelDataObject,
                        orderId: TPOrderID,
                        gongLai: true
                    })
                    TPMissOrderID && handleCancelOrderTP({
                        ...cancelDataObject,
                        orderId: TPMissOrderID,
                        gongLai: true
                    })
                    await delay(500)
                }

            }
        })

        const botApiData = botApiList[botIDMain]
        const ApiKeyBot = botApiData.ApiKey
        const SecretKeyBot = botApiData.SecretKey

        const wsConfigOrder = {
            key: ApiKeyBot,
            secret: SecretKeyBot,
            market: 'v5',
            enable_time_sync: true
        }

        const wsOrder = new WebsocketClient(wsConfigOrder);

        wsOrder.unsubscribeV5(LIST_ORDER, 'linear')

        botApiList[botIDMain] = {
            id: botIDMain,
            ApiKey: newApiData.ApiKey,
            SecretKey: newApiData.SecretKey,
        }

        const wsConfigOrderNew = {
            key: newApiData.ApiKey,
            secret: newApiData.SecretKey,
            market: 'v5',
            enable_time_sync: true
        }

        const wsOrderNew = new WebsocketClient(wsConfigOrderNew);

        wsOrderNew.subscribeV5(LIST_ORDER, 'linear')


    });

    socketRealtime.on('delete', (newData) => {
        console.log("[...] Deleted Strategies From Realtime");

        newData.map(async strategiesData => {
            if (checkConditionBot(strategiesData)) {

                const ApiKey = strategiesData.botID.ApiKey
                const SecretKey = strategiesData.botID.SecretKey

                const symbol = strategiesData.symbol
                const strategyID = strategiesData.value
                const botID = strategiesData.botID._id
                const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

                switch (strategiesData.Candlestick) {
                    case "1m": {
                        delete allStrategies1m[strategiesData.value]
                        break
                    }
                    case "3m": {
                        delete allStrategies3m[strategiesData.value]
                        break

                    }
                    case "5m": {
                        delete allStrategies5m[strategiesData.value]
                        break

                    }
                    case "15m": {
                        delete allStrategies15m[strategiesData.value]
                        break
                    }
                }

                const cancelDataObject = {
                    ApiKey,
                    SecretKey,
                    tradeCoinData,
                    strategyID,
                    symbol: symbol,
                    candle: strategiesData.Candlestick,
                    side,
                }

                delete tradeCoinData[strategyID]
                delete allStrategiesActiveByBotID[botID]?.[strategyID]

                const OCOrderID = tradeCoinData[strategyID]?.OC?.orderID
                const TPOrderID = tradeCoinData[strategyID]?.TP?.orderID
                const TPMissOrderID = missTPDataBySymbol[symbol]?.orderID

                if (OCOrderID || TPOrderID || TPMissOrderID) {
                    OCOrderID && handleCancelOrderOC(cancelDataObject)


                    TPOrderID && handleCancelOrderTP({
                        ...cancelDataObject,
                        orderId: TPOrderID,
                        gongLai: true
                    })
                    TPMissOrderID && handleCancelOrderTP({
                        ...cancelDataObject,
                        orderId: TPMissOrderID,
                        gongLai: true
                    })
                    await delay(500)
                }
            }
        })



    });

    socketRealtime.on('sync-symbol', async (newData) => {
        console.log("[...] Sync Symbol");

        const newListKline = newData.flatMap(symbolData => ([
            `kline.1.${symbolData.value}`,
            `kline.3.${symbolData.value}`,
            `kline.5.${symbolData.value}`,
            `kline.15.${symbolData.value}`,
        ]))

        newData.forEach(symbolData => {
            resetMissData(symbolData.value)
        })

        await Promise.all(newData.map(async symbol => {
            let result = await Digit(symbol.value)
            digitAllCoinObject[symbol.value] = result[0]
            allSymbolDataObject[symbol.value] = symbol._id
        }))

        wsSymbol.subscribeV5(newListKline, 'linear').then(() => {
            console.log("[V] Subscribe New Kline Successful\n");
        }).catch(err => {
            console.log("[!] Subscribe  New Kline Error:", err);
        })
    });

    socketRealtime.on('disconnect', () => {
        console.log('[V] Disconnected from socket realtime');
    });

}

Main()

