require('dotenv').config();

const { Telegraf } = require('telegraf');
const { RestClientV5, WebsocketClient } = require('bybit-api');
const { getAllStrategiesActive, getAllSymbolBE, getFutureBE } = require('./controllers/dataCoinByBit');
const { createPositionBE, updatePositionBE, deletePositionBE } = require('./controllers/position');

const StrategiesModel = require("./models/strategies.model")

// const API_KEY = "8Ttfa29X5wkjaGSa0P"
// const SECRET_KEY = "uLkFZbyooomB6FMwwlJOHWjgscbpIK4CgRFw"

// const BOT_TOKEN_RUN_TRADE = new Telegraf("6973355601:AAFucLsDHjE8JIQmtaDJR864o9w9hBhVj-Y");
// BOT_TOKEN_RUN_TRADE.launch();

const LIST_ORDER = ["order", "position"]

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
var listPricePre = {}
var listPricePreOne = {}
var trichMauOCListObject = {}
var trichMauTPListObject = {}

var allStrategiesActiveByBotID = {}
var allSymbolDataObject = {}
var botApiList = {}
var digitAllCoinObject = {}
var botAmountListObject = {}
var botListTelegram = {}

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

    tradeCoinData[strategyID]?.OC && cancelAll({ tradeCoinData, strategyID })

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

    console.log(`Price order TP ( ${candle} ):`, price);

    tradeCoinData[strategyID]?.TP && cancelAll({ tradeCoinData, strategyID })

    tradeCoinData[strategyID].TP.orderingStatus = true

    const client = new RestClientV5({
        testnet: false,
        key: ApiKey,
        secret: SecretKey,
    });
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
                console.log(`[+TP] Order TP ${missState ? "( MISS )" : ' '} ( ${side} - ${symbol} - ${candle} ) successful `)
                const newOrderID = response.result.orderId

                missTPDataBySymbol[symbol] = {
                    ...missTPDataBySymbol[symbol],
                    size: missTPDataBySymbol[symbol].size + Math.abs(qty),
                    Candlestick: candle,
                }

                missTPDataBySymbol[symbol].orderIDOfListTP.push({
                    orderID: newOrderID,
                    strategyID
                })

                if (!missState) {
                    tradeCoinData[strategyID].TP.orderID = newOrderID
                }
                else {
                    missTPDataBySymbol[symbol].orderID = newOrderID
                    missTPDataBySymbol[symbol].ApiKey = ApiKey
                    missTPDataBySymbol[symbol].SecretKey = SecretKey
                }
                missTPDataBySymbol[symbol].priceOrderTP = price

            }
            else {
                console.log(`[!] Order TP ${missState ? "( MISS )" : ' '} - ( ${side} - ${symbol} - ${candle} ) failed `, response)
                tradeCoinData[strategyID].TP.orderingStatus = false
                if (missState) {
                    console.log(`[X] Không thể xử lý MISS ( ${side} - ${symbol} - ${candle} )`);
                    console.log(`[Mongo] UPDATE MISS Position ( ${side} - ${symbol} - ${candle} )`);
                    updatePositionBE({
                        newDataUpdate: {
                            Miss: true
                        },
                        orderID: missTPDataBySymbol[symbol].orderIDToDB
                    }).then(message => {
                        console.log(message);
                    }).catch(err => {
                        console.log(err);
                        missTPDataBySymbol[symbol].orderIDToDB = ""
                    })
                }
            }
        })
        .catch((error) => {
            console.log(`[!] Order TP ${missState ? "( MISS )" : ' '} - ( ${side} - ${symbol} - ${candle} ) error `, error)
            tradeCoinData[strategyID].TP.orderingStatus = false
            if (missState) {
                console.log(`[X] Không thể xử lý MISS ( ${side} - ${symbol} - ${candle} )`);
                console.log(`[Mongo] UPDATE MISS Position ( ${side} - ${symbol} - ${candle} )`);
                updatePositionBE({
                    newDataUpdate: {
                        Miss: true
                    },
                    orderID: missTPDataBySymbol[symbol].orderIDToDB
                }).then(message => {
                    console.log(message);
                }).catch(err => {
                    console.log(err);
                    missTPDataBySymbol[symbol].orderIDToDB = ""
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

    const symbol = strategy.symbol

    if (tradeCoinData[strategyID]?.TP.orderID) {

        const TPOld = tradeCoinData[strategyID]?.TP.price

        let TPNew
        if (strategy.PositionSide === "Long") {
            TPNew = TPOld - Math.abs(TPOld - coinOpen) * (strategy.ReduceTakeProfit / 100)
        }
        else {
            TPNew = TPOld + Math.abs(TPOld - coinOpen) * (strategy.ReduceTakeProfit / 100)
        }

        tradeCoinData[strategyID].TP.price = TPNew

        const dataInput = {
            strategyID,
            tradeCoinData,
            symbol,
            price: TPNew.toFixed(strategy.digit),
            orderId: tradeCoinData[strategyID]?.TP.orderID,
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
    if (tradeCoinData[strategyID]?.OC.orderID && !tradeCoinData[strategyID]?.OC.orderFilled) {
        client
            .cancelOrder({
                category: 'linear',
                symbol,
                orderId: tradeCoinData[strategyID]?.OC.orderID,
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
                console.log(`[V] Cancel TP ( ${side} - ${symbol} - ${candle} ) successful `);
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
                console.log(`[!] Cancel TP ( ${side} - ${symbol} - ${candle} ) failed `, response);
            }
            cancelAll({ tradeCoinData, strategyID })
        })
        .catch((error) => {
            console.log(`[!] Cancel TP ( ${side} - ${symbol} - ${candle} ) error `, error);
            cancelAll({ tradeCoinData, strategyID })
        });

}

const resetMissData = (symbol) => {
    missTPDataBySymbol[symbol] = {
        size: 0,
        side: "",
        Candlestick: "",
        timeOutFunc: "",
        sizeTotal: 0,
        orderIDToDB: "",
        orderID: "",
        gongLai: false,
        orderIDOfListTP: [],
        priceOrderTP: 0,
        ApiKey: "",
        SecretKey: "",
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
            openTrade: "",
            dataSend: {}
        },
        "TP": {
            orderID: "",
            orderFilled: false,
            orderingStatus: false,
            price: 0,
            qty: 0,
        },
    }
}

// 
const sendMessageWithRetry = async ({
    messageText,
    retries = 5,
    telegramID,
    telegramToken,
}) => {

    let BOT_TOKEN_RUN_TRADE = botListTelegram[telegramID]

    try {
        if (!BOT_TOKEN_RUN_TRADE) {
            const newBotInit = new Telegraf(telegramToken)
            BOT_TOKEN_RUN_TRADE = newBotInit
            BOT_TOKEN_RUN_TRADE.launch();
            botListTelegram[telegramID] = newBotInit
        }
        for (let i = 0; i < retries; i++) {
            try {
                if (messageText) {
                    await BOT_TOKEN_RUN_TRADE.telegram.sendMessage(telegramID, messageText);
                    console.log('[->] Message sent to telegram successfully');
                    return;
                }
            } catch (error) {
                if (error.code === 429) {
                    const retryAfter = error.parameters.retry_after;
                    console.log(`[!] Rate limited. Retrying after ${retryAfter} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                } else {
                    throw error;
                }
            }
        }

        throw new Error('[!] Failed to send message after multiple retries');
    } catch (error) {
        console.log("[!] Bot Telegram Error:", error);
    } finally {
    }
};

const handleSocketBotApiList = async (botApiList = {}) => {

    const objectToArray = Object.values(botApiList);
    const objectToArrayLength = objectToArray.length;
    console.log("[New-Bot-API] Length:", objectToArrayLength);

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

                                const telegramID = strategy.botID.telegramID
                                const telegramToken = strategy.botID.telegramToken

                                if (orderID === tradeCoinData[strategyID]?.OC.orderID) {
                                    tradeCoinData[strategyID].OC.orderFilled = true

                                    // Send telegram
                                    const openTrade = +dataMain.avgPrice  //Gia khop lenh

                                    tradeCoinData[strategyID].OC.openTrade = openTrade

                                    const sideText = strategy.PositionSide === "Long" ? "Buy" : "Sell"
                                    const botName = strategy.botID.botName


                                    const qty = dataMain.qty

                                    const priceOldOrder = (botAmountListObject[strategy.botID._id] * strategy.Amount / 100).toFixed(2)

                                    missTPDataBySymbol[symbol].Candlestick = strategy.Candlestick


                                    // 

                                    if (!tradeCoinData[strategyID]?.TP.orderID && !tradeCoinData[strategyID]?.TP.orderingStatus) {


                                        let TPNew = 0

                                        const newOC = Math.abs((openTrade - strategy.coinOpen)) / openTrade * 100

                                        //console.log("[New OC]:", newOC);

                                        if (strategy.PositionSide === "Long") {
                                            TPNew = openTrade + (openTrade * newOC / 100) * (strategy.TakeProfit / 100)
                                        }
                                        else {
                                            TPNew = openTrade - (openTrade * newOC / 100) * (strategy.TakeProfit / 100)
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
                                            symbol,
                                            qty,
                                            price: TPNew,
                                            side: strategy.PositionSide === "Long" ? "Sell" : "Buy",
                                            candle: strategy.Candlestick,
                                            ApiKey,
                                            SecretKey
                                        }

                                        tradeCoinData[strategyID].OC.dataSend = dataInput

                                        console.log(`[V] Filled OC: \n${symbol} | Open ${sideText} \nBot: ${botName} \nFutures: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% -> ${newOC.toFixed(2).toString()}% | TP: ${strategy.TakeProfit}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}`);
                                        const teleText = `${symbol} | Open ${sideText} \nBot: ${botName} \nFut: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% -> ${newOC.toFixed(2).toString()}% | TP: ${strategy.TakeProfit}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}`

                                        sendMessageWithRetry({
                                            messageText: teleText,
                                            telegramID,
                                            telegramToken
                                        })

                                    }

                                }
                                // Khớp TP
                                else if (orderID === tradeCoinData[strategyID]?.TP.orderID) {

                                    const closePrice = +dataMain.avgPrice

                                    const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"
                                    const botName = strategy.botID.botName

                                    const openTradeOCFilled = tradeCoinData[strategyID]?.OC.openTrade

                                    const qty = +dataMain.qty
                                    const priceOldOrder = (botAmountListObject[strategy.botID._id] * strategy.Amount / 100).toFixed(2)

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

                                    sendMessageWithRetry({
                                        messageText: `${teleText} \n${textWinLose}`,
                                        telegramID,
                                        telegramToken
                                    })

                                    missTPDataBySymbol[symbol].size -= Math.abs(qty)

                                    // Fill toàn bộ
                                    if (missTPDataBySymbol[symbol].sizeTotal == qty || missTPDataBySymbol[symbol].size == 0) {
                                        // 
                                        console.log(`[_FULL Filled_] Filled TP ( ${side} - ${symbol} - ${strategy.Candlestick} )`);
                                        console.log(`[Mongo] Delete Position ( ${side} - ${symbol} - ${strategy.Candlestick} )`);

                                        deletePositionBE({
                                            orderID: missTPDataBySymbol[symbol].orderIDToDB
                                        }).then(message => {
                                            console.log(message);
                                            missTPDataBySymbol[symbol].orderIDToDB = ""
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
                                            missTPDataBySymbol[symbol].orderIDToDB = ""
                                        })
                                    }


                                }
                                // User cancel vị thế
                                if (dataMain.orderType === "Market") {
                                    const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"
                                    console.log('[...] User Clicked Close Vị Thế');
                                    if (tradeCoinData[strategyID]?.TP.orderID) {
                                        handleCancelOrderTP(
                                            {
                                                tradeCoinData,
                                                strategyID,
                                                symbol: strategy.symbol,
                                                side,
                                                orderId: tradeCoinData[strategyID]?.TP.orderID,
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
                                                side,
                                                orderId: missTPDataBySymbol[strategy.symbol].TP.orderID,
                                                candle: strategy.Candlestick,
                                                ApiKey,
                                                SecretKey
                                            }
                                        )
                                    }

                                    if (missTPDataBySymbol[symbol].orderIDToDB && missTPDataBySymbol[symbol].Candlestick === strategy.Candlestick) {
                                        console.log(`[Mongo] Delete Position ( ${side} - ${symbol} - ${strategy.Candlestick} )`);
                                        missTPDataBySymbol[symbol].orderIDToDB && deletePositionBE({
                                            orderID: missTPDataBySymbol[symbol].orderIDToDB
                                        }).then(message => {
                                            console.log(message);
                                            missTPDataBySymbol[symbol].orderIDToDB = ""
                                        }).catch(err => {
                                            console.log(err);
                                        })
                                    }
                                }
                            }
                            else if (dataMain.orderStatus === "Cancelled") {
                                // console.log("[X] Cancelled");
                                // Khớp TP
                                if (orderID === tradeCoinData[strategyID]?.TP.orderID) {
                                    console.log(`[-] Cancelled TP ( ${strategy.PositionSide === "Long" ? "Sell" : "Buy"} - ${symbol} - ${strategy.Candlestick} ) - Chốt lời `);
                                    // cancelAll({ tradeCoinData, strategyID, symbol })
                                }
                                else if (orderID === tradeCoinData[strategyID]?.OC.orderID) {
                                    console.log(`[-] Cancelled OC ( ${strategy.PositionSide === "Long" ? "Sell" : "Buy"} - ${symbol} - ${strategy.Candlestick}) `);
                                    cancelAll({ tradeCoinData, strategyID })
                                }

                            }
                        }

                        else if (dataCoin.topic === "position") {
                            const size = Math.abs(dataMain.size)

                            // if (size > 0 && strategy.Candlestick === missTPDataBySymbol[symbol].Candlestick) {
                            if (size > 0) {

                                missTPDataBySymbol[symbol].timeOutFunc && clearTimeout(missTPDataBySymbol[symbol].timeOutFunc)

                                missTPDataBySymbol[symbol].timeOutFunc = setTimeout(() => {

                                    const dataMain = dataCoin.data[0]
                                    const symbol = dataMain.symbol
                                    const side = dataMain.side
                                    const size = Math.abs(dataMain.size)

                                    const missSize = size - missTPDataBySymbol[symbol].size

                                    missTPDataBySymbol[symbol].sizeTotal = size

                                    const openTrade = +dataMain.entryPrice  //Gia khop lenh
                                    // 
                                    console.log(`\n[Saving->Mongo] Position ( ${side} - ${symbol} )`);

                                    const Quantity = side === "Buy" ? size : (size * -1)

                                    const newDataToDB = {
                                        Symbol: symbol,
                                        Side: side,
                                        Quantity,
                                        Price: openTrade,
                                        Pnl: dataMain.unrealisedPnl,
                                    }

                                    if (!missTPDataBySymbol[symbol].orderIDToDB) {

                                        const orderIDToDB = dataCoin.id
                                        createPositionBE({
                                            ...newDataToDB,
                                            orderID: orderIDToDB,
                                            botID: strategy.botID._id,
                                        }).then(message => {
                                            missTPDataBySymbol[symbol].orderIDToDB = orderIDToDB
                                            console.log(message);
                                        }).catch(err => {
                                            console.log(err);
                                        })
                                    }

                                    if (!missTPDataBySymbol[symbol].gongLai) {
                                        if (missSize > 0) {
                                            if (!tradeCoinData[strategyID]?.TP.orderingStatus && !missTPDataBySymbol[symbol].orderID) {

                                                console.log(`\n[_ MISS _] TP ( ${side} - ${symbol} ): ${missSize}\n`);

                                                const TPNew = missTPDataBySymbol[symbol].priceOrderTP

                                                // console.log("openTrade", openTrade);

                                                // if (strategy.PositionSide === "Long") {
                                                //     TPNew = openTrade + (openTrade * strategy.OrderChange / 100) * (strategy.TakeProfit / 100)
                                                // }
                                                // else {
                                                //     TPNew = openTrade - (openTrade * strategy.OrderChange / 100) * (strategy.TakeProfit / 100)
                                                // }

                                                missTPDataBySymbol[symbol].prePrice = TPNew
                                                missTPDataBySymbol[symbol].side = side

                                                const dataInput = {
                                                    tradeCoinData,
                                                    strategyID,
                                                    symbol: strategy.symbol,
                                                    qty: missSize.toString(),
                                                    price: TPNew,
                                                    side: side === "Buy" ? "Sell" : "Buy",
                                                    ApiKey,
                                                    SecretKey,
                                                    missState: true
                                                }
                                                console.log("[ Re-TP ] Order TP Miss");
                                                handleSubmitOrderTP(dataInput)
                                            }

                                        }
                                        else {
                                            console.log(`[_ Not Miss _] TP ( ${side} - ${symbol}} )`);
                                            updatePositionBE({
                                                newDataUpdate: {
                                                    ...newDataToDB,
                                                    Miss: false
                                                },
                                                orderID: missTPDataBySymbol[symbol].orderIDToDB
                                            }).then(message => {
                                                console.log(message);
                                            }).catch(err => {
                                                console.log(err);
                                                missTPDataBySymbol[symbol].orderIDToDB = ""
                                            })
                                        }
                                    }
                                    else {
                                        console.log(`\n[_ MISS _] TP ( ${side} - ${symbol} ): ${missSize}\n`);
                                        console.log(`[Mongo] UPDATE MISS Position ( ${side} - ${symbol} )`);
                                        updatePositionBE({
                                            newDataUpdate: {
                                                ...newDataToDB,
                                                Miss: true
                                            },
                                            orderID: missTPDataBySymbol[symbol].orderIDToDB
                                        }).then(message => {
                                            console.log(message);
                                        }).catch(err => {
                                            console.log(err);
                                            missTPDataBySymbol[symbol].orderIDToDB = ""
                                        })
                                    }



                                }, 1500)
                            }
                            else {
                                missTPDataBySymbol[symbol].timeOutFunc && clearTimeout(missTPDataBySymbol[symbol].timeOutFunc)
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

const renderAllStrategies = ({
    allStrategies = {},
    candle,
    dataCoin
}) => {
    Object.values(allStrategies).forEach(strategy => {
        const strategyID = strategy.value

        strategy.digit = digitAllCoinObject[strategy.symbol]

        const topic = dataCoin.topic
        const symbol = topic.split(".").slice(-1)?.[0]

        const CDle = candle
        if (checkConditionBot(strategy)) {
            if (topic === `kline.${CDle}.${symbol}`) {

                if (strategy.symbol === symbol) {

                    const dataMain = dataCoin.data[0]
                    const coinOpen = +dataMain.open

                    strategy.coinOpen = coinOpen

                    const botID = strategy.botID._id

                    const ApiKey = strategy.botID.ApiKey
                    const SecretKey = strategy.botID.SecretKey
                    const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"

                    const symbolCandleID = `${symbol}-${CDle}`

                    if (dataMain.confirm == false) {
                        if (!tradeCoinData[strategyID]?.OC.orderID && !tradeCoinData[strategyID]?.OC.orderingStatus && strategy.IsActive) {
                            setTimeout(() => {

                                const coinCurrent = +dataMain.close

                                const khoangGia = Math.abs(coinCurrent - trichMauOCListObject[symbolCandleID].prePrice)

                                if (khoangGia > trichMauOCListObject[symbolCandleID].maxPrice) {
                                    trichMauOCListObject[symbolCandleID].maxPrice = khoangGia
                                    trichMauOCListObject[symbolCandleID].minPrice = []
                                }
                                else {
                                    if (khoangGia <= trichMauOCListObject[symbolCandleID].maxPrice / 4) {
                                        if (trichMauOCListObject[symbolCandleID].minPrice.length === 3) {
                                            trichMauOCListObject[symbolCandleID].minPrice.shift()
                                        }
                                        trichMauOCListObject[symbolCandleID].minPrice.push(khoangGia)
                                    }
                                }
                                trichMauOCListObject[symbolCandleID].prePrice = coinCurrent

                                if (trichMauOCListObject[symbolCandleID].minPrice.length === 3) {
                                    let conditionOrder = 0
                                    let priceOrder = 0

                                    // Check pre coin type 

                                    let coinPreCoin = ""
                                    let conditionPre = true

                                    const pricePreData = listPricePreOne[symbolCandleID]
                                    if (pricePreData.close > pricePreData.open) {
                                        coinPreCoin = "Blue"
                                    }
                                    else {
                                        coinPreCoin = "Red"
                                    }
                                    // BUY
                                    if (side === "Buy") {

                                        if (coinPreCoin === "Blue") {
                                            const preValue = pricePreData.high - pricePreData.open
                                            const currentValue = coinOpen - coinCurrent
                                            conditionPre = currentValue >= (strategy.Ignore / 100) * preValue
                                        }
                                        conditionOrder = (coinOpen - coinOpen * (strategy.OrderChange / 100) * (strategy.ExtendedOCPercent / 100)).toFixed(strategy.digit)
                                        priceOrder = (coinOpen - coinOpen * strategy.OrderChange / 100)
                                        if (coinCurrent <= priceOrder) {
                                            priceOrder = coinCurrent
                                        }
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
                                        if (coinCurrent >= priceOrder) {
                                            priceOrder = coinCurrent
                                        }
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
                                        candle: `${CDle}m`,

                                    }

                                    if (side === "Buy") {
                                        +conditionOrder >= coinCurrent && (coinOpen - coinCurrent) > 0 && conditionPre && handleSubmitOrder(dataInput)
                                    }
                                    else {
                                        // SELL
                                        +conditionOrder <= coinCurrent && (coinOpen - coinCurrent) < 0 && conditionPre && handleSubmitOrder(dataInput)
                                    }
                                }

                            }, 250)
                        }
                        else if (tradeCoinData[strategyID]?.OC.orderFilled) {
                            if (!tradeCoinData[strategyID]?.TP.orderID && !tradeCoinData[strategyID]?.TP.orderingStatus && tradeCoinData[strategyID]?.OC?.dataSend?.price) {
                                setTimeout(() => {

                                    const coinCurrent = +dataMain.close

                                    const khoangGia = Math.abs(coinCurrent - trichMauTPListObject[symbolCandleID].prePrice)

                                    if (khoangGia > trichMauTPListObject[symbolCandleID].maxPrice) {
                                        trichMauTPListObject[symbolCandleID].maxPrice = khoangGia
                                        trichMauTPListObject[symbolCandleID].minPrice = []
                                    }
                                    else {
                                        if (khoangGia <= trichMauTPListObject[symbolCandleID].maxPrice / 4) {
                                            if (trichMauTPListObject[symbolCandleID].minPrice.length === 3) {
                                                trichMauTPListObject[symbolCandleID].minPrice.shift()
                                            }
                                            trichMauTPListObject[symbolCandleID].minPrice.push(khoangGia)
                                        }
                                    }
                                    trichMauTPListObject[symbolCandleID].prePrice = coinCurrent


                                    let priceOrder = tradeCoinData[strategyID]?.OC.dataSend.price

                                    if (trichMauTPListObject[symbolCandleID].minPrice.length === 3) {
                                        if (side === "Buy") {
                                            if (coinCurrent >= priceOrder) {
                                                priceOrder = coinCurrent
                                            }
                                        }
                                        else {
                                            if (coinCurrent <= priceOrder) {
                                                priceOrder = coinCurrent
                                            }
                                        }
                                    }

                                    handleSubmitOrderTP({
                                        ...tradeCoinData[strategyID]?.OC.dataSend,
                                        price: priceOrder.toFixed(strategy.digit)
                                    })

                                }, 250)
                            }
                        }

                    }
                    // Coin CLosed
                    else if (dataMain.confirm == true) {

                        const data = dataCoin.data[0]
                        const coinClose = +data.close

                        listPricePreOne[symbolCandleID] = {
                            open: +data.open,
                            close: coinClose,
                            high: +data.high,
                            low: +data.low,
                        }

                        if (Object.values(listPricePre[symbolCandleID]).length === 3) {
                            listPricePre[symbolCandleID].shift()
                            listPricePre[symbolCandleID].push({
                                open: +data.open,
                                close: coinClose,
                            })
                        }
                        else {
                            listPricePre[symbolCandleID].push({
                                open: +data.open,
                                close: coinClose,
                            })
                        }

                        // console.log(` New Candle ${strategy.PositionSide} `)
                        tradeCoinData[strategyID]?.OC.orderID && !tradeCoinData[strategyID]?.OC.orderFilled && handleCancelOrderOC(
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

                        // TP chưa khớp -> Dịch TP mới

                        if (tradeCoinData[strategyID]?.TP.orderID) {
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



                        trichMauOCListObject[symbolCandleID] = {
                            maxPrice: 0,
                            minPrice: [],
                            prePrice: 0
                        }
                    }
                }

            }
        }

    })
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

    allSymbol.forEach(item => {
        const symbol = item.value
        const listKline = [1, 3, 5, 15]
        listKline.forEach(candle => {
            const symbolCandleID = `${symbol}-${candle}`
            listPricePre[symbolCandleID] = []
            listPricePreOne[symbolCandleID] = {
                open: 0,
                close: 0,
                high: 0,
                low: 0,
            }
            trichMauOCListObject[symbolCandleID] = {
                maxPrice: 0,
                minPrice: [],
                prePrice: 0
            }
            trichMauTPListObject[symbolCandleID] = {
                maxPrice: 0,
                minPrice: [],
                prePrice: 0,
            }
        })
        resetMissData(symbol)
    })


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
        }
        return pre; // Return the accumulator
    }, {});

    // KLINE
    wsSymbol.subscribeV5(listKline, 'linear').then(() => {

        console.log("[V] Subscribe kline successful\n");

        wsSymbol.on('update', (dataCoin) => {

            renderAllStrategies({
                allStrategies: allStrategies1m,
                candle: 1,
                dataCoin
            })

            renderAllStrategies({
                allStrategies: allStrategies3m,
                candle: 3,
                dataCoin
            })

            renderAllStrategies({
                allStrategies: allStrategies5m,
                candle: 5,
                dataCoin
            })

            renderAllStrategies({
                allStrategies: allStrategies15m,
                candle: 15,
                dataCoin
            })

            // Xử lý miss
            if (dataCoin.data[0].confirm == true) {

                const topic = dataCoin.topic
                const symbol = topic.split(".").slice(-1)?.[0]

                // TP chưa khớp -> Dịch TP MISS mới
                if (missTPDataBySymbol[symbol]?.orderID && !missTPDataBySymbol[symbol].gongLai) {
                    const TPOld = missTPDataBySymbol[symbol].prePrice

                    let TPNew
                    if (missTPDataBySymbol[symbol].side === "Buy") {
                        TPNew = TPOld - Math.abs(TPOld - coinOpen) * (50 / 100)
                    }
                    else {
                        TPNew = TPOld + Math.abs(TPOld - coinOpen) * (50 / 100)
                    }

                    missTPDataBySymbol[symbol].prePrice = TPNew

                    const client = new RestClientV5({
                        testnet: false,
                        key: missTPDataBySymbol[symbol].ApiKey,
                        secret: missTPDataBySymbol[symbol].SecretKey,
                    });
                    client
                        .amendOrder({
                            category: 'linear',
                            symbol,
                            price: TPNew,
                            orderId: missTPDataBySymbol[symbol].orderId,
                        })
                        .then((response) => {
                            if (response.retCode == 0) {
                                console.log(`[->] Move Order TP Miss( ${symbol} ) successful`)
                                missTPDataBySymbol[symbol].orderId = response.result.orderId
                            }
                            else {
                                console.log(`[!] Move Order TP Miss ( ${symbol} ) failed `, response)
                                missTPDataBySymbol[symbol].orderId = ""
                            }
                        })
                        .catch((error) => {
                            console.log(`[!] Move Order TP Miss ( ${symbol} ) error `, error)
                            missTPDataBySymbol[symbol].orderId = ""
                        });
                }
            }

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

    const socketRealtime = socket(process.env.SOCKET_IP);

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

                cancelAll({ tradeCoinData, strategyID })

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

    socketRealtime.on('update', async (newData = []) => {
        console.log("[...] Update Strategies From Realtime", newData.length);

        const newBotApiList = {}

        let updateMongoMiss = false
        newData.map(async strategiesData => {

            if (checkConditionBot(strategiesData)) {

                const ApiKey = strategiesData.botID.ApiKey
                const SecretKey = strategiesData.botID.SecretKey
                const botID = strategiesData.botID._id

                const symbol = strategiesData.symbol
                const strategyID = strategiesData.value
                const IsActive = strategiesData.IsActive
                const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

                switch (strategiesData.Candlestick) {
                    case "1m": {
                        allStrategies1m[strategyID] = strategiesData
                        break
                    }
                    case "3m": {
                        allStrategies3m[strategyID] = strategiesData
                        break

                    }
                    case "5m": {
                        allStrategies5m[strategyID] = strategiesData
                        break

                    }
                    case "15m": {
                        allStrategies15m[strategyID] = strategiesData
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

                !tradeCoinData[strategyID] && cancelAll({ tradeCoinData, strategyID })

                if (IsActive && !botApiList[botID]) {
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
                    allStrategiesActiveByBotID[botID][strategyID] = strategiesData
                }
                else {
                    delete allStrategiesActiveByBotID[botID]?.[strategyID]
                    !updateMongoMiss && missTPDataBySymbol[symbol].orderIDToDB && updatePositionBE({
                        newDataUpdate: {
                            Miss: true
                        },
                        orderID: missTPDataBySymbol[symbol].orderIDToDB
                    }).then(message => {
                        console.log(message);
                        updateMongoMiss = true
                    }).catch(err => {
                        console.log(err);
                        missTPDataBySymbol[symbol].orderIDToDB = ""
                    })
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

        await handleSocketBotApiList(newBotApiList)


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
                        delete allStrategies1m[strategyID]
                        break
                    }
                    case "3m": {
                        delete allStrategies3m[strategyID]
                        break

                    }
                    case "5m": {
                        delete allStrategies5m[strategyID]
                        break

                    }
                    case "15m": {
                        delete allStrategies15m[strategyID]
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


    socketRealtime.on('bot-update', (newData = []) => {
        console.log("[...] Update Strategies From Realtime", newData.length);

        newData.map(async strategiesData => {


            const ApiKey = strategiesData.botID.ApiKey
            const SecretKey = strategiesData.botID.SecretKey
            const botID = strategiesData.botID._id

            const symbol = strategiesData.symbol
            const strategyID = strategiesData.value
            const IsActive = strategiesData.IsActive
            const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"


            switch (strategiesData.Candlestick) {
                case "1m": {
                    allStrategies1m[strategyID] = strategiesData
                    break
                }
                case "3m": {
                    allStrategies3m[strategyID] = strategiesData
                    break

                }
                case "5m": {
                    allStrategies5m[strategyID] = strategiesData
                    break

                }
                case "15m": {
                    allStrategies15m[strategyID] = strategiesData
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

        })

    });

    socketRealtime.on('bot-api', async (data) => {
        const { newData, botID: botIDMain, newApiData } = data;
        console.log("[...] Update Strategies From Realtime", newData.length);

        newData.map(async strategiesData => {

            if (checkConditionBot(strategiesData)) {
                const strategyID = strategiesData.value
                const symbol = strategiesData.symbol

                const OCOrderID = tradeCoinData[strategyID]?.OC?.orderID
                const TPOrderID = tradeCoinData[strategyID]?.TP?.orderID
                const TPMissOrderID = missTPDataBySymbol[symbol]?.orderID

                const cancelDataObject = {
                    ApiKey,
                    SecretKey,
                    tradeCoinData,
                    strategyID,
                    symbol: symbol,
                    candle: strategiesData.Candlestick,
                    side,
                }

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

        // 
        try {
            const botApiData = botApiList[botIDMain]
            const ApiKeyBot = botApiData.ApiKey
            const SecretKeyBot = botApiData.SecretKey

            const wsConfigOrder = {
                key: ApiKeyBot,
                secret: SecretKeyBot,
                market: 'v5',
            }

            const wsOrder = new WebsocketClient(wsConfigOrder);

            await wsOrder.unsubscribeV5(LIST_ORDER, 'linear')

            botApiList[botIDMain] = {
                id: botIDMain,
                ApiKey: newApiData.ApiKey,
                SecretKey: newApiData.SecretKey,
            }

            const wsConfigOrderNew = {
                key: newApiData.ApiKey,
                secret: newApiData.SecretKey,
                market: 'v5',
            }

            const wsOrderNew = new WebsocketClient(wsConfigOrderNew);

            await wsOrderNew.subscribeV5(LIST_ORDER, 'linear')
        } catch (error) {
            console.log("[!] Error subscribeV5", error);
        }

    });

    socketRealtime.on('bot-delete', (data) => {
        const { newData, botID: botIDMain } = data;
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
                        delete allStrategies1m[strategyID]
                        break
                    }
                    case "3m": {
                        delete allStrategies3m[strategyID]
                        break

                    }
                    case "5m": {
                        delete allStrategies5m[strategyID]
                        break

                    }
                    case "15m": {
                        delete allStrategies15m[strategyID]
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

        if (botListTelegram[telegramIDOld]) {
            botListTelegram[telegramIDOld]?.stop()
            delete botListTelegram[telegramIDOld]
        }

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

        delete botApiList[botIDMain]

    });

    socketRealtime.on('bot-telegram', async (data) => {
        console.log("[...] Update Bot Telegram From Realtime");

        const { newData, botID: botIDMain, newApiData } = data;
        const telegramIDOld = newApiData.telegramIDOld
        const telegramID = newApiData.telegramID
        const telegramToken = newApiData.telegramToken

        newData.map(async strategiesData => {

            if (checkConditionBot(strategiesData)) {

                const strategyID = strategiesData.value

                const newStrategiesDataUpdate = {
                    ...strategiesData,
                    botID:
                    {
                        ...strategiesData.botID,
                        telegramID,
                        telegramToken,
                    }
                }

                allStrategiesActiveByBotID[botIDMain][strategyID] = newStrategiesDataUpdate
            }
        })

        if (botListTelegram[telegramIDOld]) {
            botListTelegram[telegramIDOld]?.stop()
            delete botListTelegram[telegramIDOld]
        }
    });

    socketRealtime.on('sync-symbol', async (newData) => {
        console.log("[...] Sync Symbol");

        const newListKline = newData.flatMap(symbolData => ([
            `kline.1.${symbolData.value}`,
            `kline.3.${symbolData.value}`,
            `kline.5.${symbolData.value}`,
            `kline.15.${symbolData.value}`,
        ]))


        await Promise.all(newData.map(async symbol => {
            let result = await Digit(symbol.value)
            digitAllCoinObject[symbol.value] = result[0]
            allSymbolDataObject[symbol.value] = symbol._id
        }))

        newData.forEach(item => {
            const symbol = item.value
            const listKline = [1, 3, 5, 15]
            listKline.forEach(candle => {
                const symbolCandleID = `${symbol}-${candle}`
                listPricePre[symbolCandleID] = []
                listPricePreOne[symbolCandleID] = {
                    open: 0,
                    close: 0,
                    high: 0,
                    low: 0,
                }
                trichMauOCListObject[symbolCandleID] = {
                    maxPrice: 0,
                    minPrice: [],
                    prePrice: 0
                }
                trichMauTPListObject[symbolCandleID] = {
                    maxPrice: 0,
                    minPrice: [],
                    prePrice: 0,
                }
            })
            resetMissData(symbol)
        })


        wsSymbol.subscribeV5(newListKline, 'linear').then(() => {
            console.log("[V] Subscribe New Kline Successful\n");
        }).catch(err => {
            console.log("[!] Subscribe  New Kline Error:", err);
        })
    });

    socketRealtime.on("close-limit", async (data) => {
        const { positionData } = data
        const symbol = positionData.Symbol
        await Promise.allSettled(missTPDataBySymbol[symbol].orderIDOfListTP.map(orderIdTPData => {
            return handleCancelOrderTP({
                ApiKey: positionData.botID.ApiKey,
                SecretKey: positionData.botID.SecretKey,
                tradeCoinData,
                strategyID: orderIdTPData.strategyID,
                symbol,
                side: positionData.Side,
                candle: positionData.Candle,
                orderId: orderIdTPData.orderID,
            })
        }))
    })

    socketRealtime.on('disconnect', () => {
        console.log('[V] Disconnected from socket realtime');
    });
}

Main()

process.once('SIGINT', () => {
    Object.values(botListTelegram).forEach(botData => {
        botData.stop('SIGINT')
    })
})
process.once('SIGTERM', () => {
    Object.values(botListTelegram).forEach(botData => {
        botData.stop('SIGTERM')
    })
})

