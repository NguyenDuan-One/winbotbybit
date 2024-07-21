require('dotenv').config();
const cron = require('node-cron');
const changeColorConsole = require('cli-color');
const TelegramBot = require('node-telegram-bot-api');

const { RestClientV5, WebsocketClient } = require('bybit-api');
const { getAllStrategiesActive, getAllSymbolBE, getFutureBE } = require('./controllers/dataCoinByBit');
const { createPositionBE, updatePositionBE, deletePositionBE, getPositionBySymbol } = require('./controllers/position');

const wsConfig = {
    market: 'v5',
    recvWindow: 60000
}

const wsSymbol = new WebsocketClient(wsConfig);

const LIST_ORDER = ["order", "position"]

const clientDigit = new RestClientV5({
    testnet: false,
    recv_window: 60000,
    enable_time_sync: true
});

// ----------------------------------------------------------------------------------
let missTPDataBySymbol = {}

var listKline = []
var allSymbol = []

var allStrategiesByCandleAndSymbol = {}
var listPricePre = {}
var listPricePreOne = {}
var trichMauOCListObject = {}
var trichMauTPListObject = {}

var allStrategiesByBotIDAndOrderID = {}
var allStrategiesByBotIDAndStrategiesID = {}
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
            console.error(changeColorConsole.redBright(error));
        });
    return PScale
}

const handleSubmitOrder = async ({
    strategy,
    strategyID,
    symbol,
    qty,
    side,
    price,
    candle,
    ApiKey,
    SecretKey,
    botName,
    botID,
    telegramID,
    telegramToken
}) => {

    !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID })

    const client = new RestClientV5({
        testnet: false,
        key: ApiKey,
        secret: SecretKey,
        recv_window: 60000,
        enable_time_sync: true
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
                const newOrderID = response.result.orderId
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID = newOrderID
                allStrategiesByBotIDAndOrderID[botID][newOrderID] = {
                    strategy,
                    OC: true,
                }

                const newOC = Math.abs((price - strategy.coinOpen)) / strategy.coinOpen * 100

                const text = `\n[+OC] Order OC ( ${strategy.OrderChange}% -> ${newOC.toFixed(2)}% ) ( ${botName} - ${side} - ${symbol} - ${candle} ) successful`
                console.log(text)

                sendMessageWithRetry({
                    messageText: text,
                    telegramID,
                    telegramToken
                })
            }
            else {
                console.log(changeColorConsole.yellowBright(`\n[!] Ordered OC ( ${botName} - ${side} - ${symbol} - ${candle} ) failed: `, response.retMsg))
            }

        })
        .catch((error) => {
            console.log(changeColorConsole.redBright(`\n[!] Ordered OC ( ${botName} - ${side} - ${symbol} - ${candle} ) error `, error))
        });
}

const handleSubmitOrderTP = ({
    strategy,
    strategyID,
    symbol,
    side,
    qty,
    price,
    candle = "",
    ApiKey,
    SecretKey,
    missState = false,
    botName,
    botID
}) => {

    console.log(changeColorConsole.greenBright(`Price order TP ( ${botName} - ${side} - ${symbol} - ${candle} ):`, price));


    const botSymbolMissID = `${botID}-${symbol}`

    const client = new RestClientV5({
        testnet: false,
        key: ApiKey,
        secret: SecretKey,
        recv_window: 60000,
        enable_time_sync: true
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
                const newOrderID = response.result.orderId


                missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)


                missTPDataBySymbol[botSymbolMissID] = {
                    ...missTPDataBySymbol[botSymbolMissID],
                    size: missTPDataBySymbol[botSymbolMissID].size + Math.abs(qty),
                    priceOrderTP: price
                }

                missTPDataBySymbol[botSymbolMissID].orderIDOfListTP.push({
                    orderID: newOrderID,
                    strategyID
                })

                if (!missState) {
                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = newOrderID
                    allStrategiesByBotIDAndOrderID[botID][newOrderID] = {
                        strategy,
                        TP: true,
                    }
                }
                else {
                    // allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderFilled = true
                    missTPDataBySymbol[botSymbolMissID].orderID = newOrderID
                    missTPDataBySymbol[botSymbolMissID].ApiKey = ApiKey
                    missTPDataBySymbol[botSymbolMissID].SecretKey = SecretKey
                    missTPDataBySymbol[botSymbolMissID].botID = botID
                    missTPDataBySymbol[botSymbolMissID].botName = botName
                }


                console.log(`[+TP] Order TP ${missState ? "( MISS )" : ''} ( ${botName} - ${side} - ${symbol} - ${candle} ) successful`)
                console.log(`[_Mongo_] UPDATE MISS Position ( ${botName} - ${side} - ${symbol} - ${candle} )`);

            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Order TP ${missState ? "( MISS )" : ''} - ( ${botName} - ${side} - ${symbol} - ${candle} ) failed `, response.retMsg))
                if (missState) {
                    console.log(changeColorConsole.yellowBright(`[X] Không thể xử lý MISS ( ${botName} - ${side} - ${symbol} - ${candle} )`))
                    console.log(`[_Mongo_] UPDATE MISS Position ( ${botName} - ${side} - ${symbol} - ${candle} )`);
                    updatePositionBE({
                        newDataUpdate: {
                            Miss: true,
                            TimeUpdated: new Date()
                        },
                        orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                    }).then(message => {
                        console.log(message);
                    }).catch(err => {
                        console.log(changeColorConsole.redBright(err));
                    })
                }
            }
        })
        .catch((error) => {
            console.log(changeColorConsole.redBright(`[!] Order TP ${missState ? "( MISS )" : ''} - ( ${botName} - ${side} - ${symbol} - ${candle} ) error `, error))
            if (missState) {
                console.log(changeColorConsole.redBright(`[X] Không thể xử lý MISS ( ${botName} - ${side} - ${symbol} - ${candle} )`))
                console.log(`[_Mongo_] UPDATE MISS Position ( ${botName} - ${side} - ${symbol} - ${candle} )`);
                updatePositionBE({
                    newDataUpdate: {
                        Miss: true,
                        TimeUpdated: new Date()
                    },
                    orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                }).then(message => {
                    console.log(message);
                }).catch(err => {
                    console.log(changeColorConsole.redBright(err));
                })
            }
        });
}

const moveOrderTP = ({
    strategyID,
    symbol,
    price,
    orderId,
    candle,
    side,
    ApiKey,
    SecretKey,
    botName,
    botID
}) => {
    // console.log(changeColorConsole.greenBright(`Price Move TP ( ${botName} - ${side} - ${symbol} - ${candle} ):`, price));

    const client = new RestClientV5({
        testnet: false,
        key: ApiKey,
        secret: SecretKey,
        recv_window: 60000,
        enable_time_sync: true
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
                console.log(changeColorConsole.magentaBright(`[->] Move Order TP ( ${botName} - ${side} - ${symbol} - ${candle} ) successful`))
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = response.result.orderId
            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Move Order TP ( ${botName} - ${side} - ${symbol} - ${candle} ) failed `, response.retMsg))
                // allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = ""
            }
        })
        .catch((error) => {
            console.log(changeColorConsole.redBright(`[!] Move Order TP ( ${botName} - ${side} - ${symbol} - ${candle} ) error `, error))
            // allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = ""
        });

}

const handleMoveOrderTP = ({
    strategyID,
    strategy,
    coinOpen,
    candle = "",
    side,
    ApiKey,
    SecretKey,
    botName,
    botID
}) => {

    const sideText = side === "Buy" ? "Sell" : "buy"
    const symbol = strategy.symbol

    if (allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.TP.orderID) {

        const TPOld = allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.TP.price

        let TPNew
        if (strategy.PositionSide === "Long") {
            TPNew = TPOld - Math.abs(TPOld - coinOpen) * (strategy.ReduceTakeProfit / 100)
        }
        else {
            TPNew = TPOld + Math.abs(TPOld - coinOpen) * (strategy.ReduceTakeProfit / 100)
        }

        allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.price = TPNew

        const dataInput = {
            strategyID,
            symbol,
            price: TPNew.toFixed(strategy.digit),
            orderId: allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.TP.orderID,
            candle,
            side: sideText,
            ApiKey,
            SecretKey,
            botName,
            botID
        }
        moveOrderTP(dataInput)

    }
}

const handleCancelOrderOC = ({
    strategyID,
    symbol,
    candle = "",
    side,
    ApiKey,
    SecretKey,
    botName,
    botID
}) => {
    const orderId = allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID

    const client = new RestClientV5({
        testnet: false,
        key: ApiKey,
        secret: SecretKey,
        recv_window: 60000,
        enable_time_sync: true
    });
    client
        .cancelOrder({
            category: 'linear',
            symbol,
            orderId
        })
        .then((response) => {
            if (response.retCode == 0) {
                console.log(`[V] Cancel order ( ${botName} - ${side} -  ${symbol} - ${candle} ) successful `);
            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Cancel order ( ${botName} - ${side} -  ${symbol} - ${candle} ) failed `, response.retMsg))
            }
            cancelAll({ strategyID, botID })
        })
        .catch((error) => {
            console.log(changeColorConsole.redBright(`[!] Cancel order ( ${botName} - ${side} -  ${symbol} - ${candle} ) error `, error))
            cancelAll({ strategyID, botID })
        });

}

const handleCancelOrderTP = ({
    strategyID,
    symbol,
    side,
    candle = "",
    orderId,
    ApiKey,
    SecretKey,
    gongLai = false,
    botName,
    botID
}) => {
    const botSymbolMissID = `${botID}-${symbol}`

    const client = new RestClientV5({
        testnet: false,
        key: ApiKey,
        secret: SecretKey,
        recv_window: 60000,
        enable_time_sync: true
    });
    client
        .cancelOrder({
            category: 'linear',
            symbol,
            orderId,
        })
        .then((response) => {
            if (response.retCode == 0) {
                console.log(`[V] Cancel TP ( ${botName} - ${side} - ${symbol} - ${candle} ) successful `);

                if (gongLai) {
                    missTPDataBySymbol[botSymbolMissID].gongLai = true
                    missTPDataBySymbol[botSymbolMissID]?.orderIDToDB && updatePositionBE({
                        newDataUpdate: {
                            Miss: true,
                            TimeUpdated: new Date()
                        },
                        orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                    }).then(message => {
                        console.log(message);
                        updateMongoMiss = true
                    }).catch(err => {
                        console.log(changeColorConsole.redBright(err));
                    })
                    resetMissData({
                        botID,
                        symbol
                    })
                    cancelAll({
                        botID,
                        strategyID
                    })
                }
                // else {
                //     console.log(`[_DELETE_] Position ( ${botName} - ${side} - ${symbol} - ${candle} )`);
                //     missTPDataBySymbol[botSymbolMissID].orderIDToDB && deletePositionBE({
                //         orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                //     }).then(message => {
                //         console.log(message);
                //     }).catch(err => {
                //         console.log(err);
                //     })
                // }
            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Cancel TP ( ${botName} - ${side} - ${symbol} - ${candle} ) failed `, response.retMsg))
            }
            cancelAll({ strategyID, botID })
        })
        .catch((error) => {
            console.log(changeColorConsole.redBright(`[!] Cancel TP ( ${botName} - ${side} - ${symbol} - ${candle} ) error `, error))
            cancelAll({ strategyID, botID })
        });

}

const resetMissData = ({
    botID,
    symbol
}) => {
    const id = `${botID}-${symbol}`
    missTPDataBySymbol[id] = {
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
        prePrice: 0,
        ApiKey: "",
        SecretKey: "",
        botName: "",
        botID: "",
    }

}

const cancelAll = (
    {
        strategyID,
        botID
    }
) => {
    const data = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
    if (data) {
        const OCOrderID = data?.OC?.orderID
        const TPOrderID = data?.TP?.orderID
        OCOrderID && delete allStrategiesByBotIDAndOrderID[botID]?.[OCOrderID]
        TPOrderID && delete allStrategiesByBotIDAndOrderID[botID]?.[TPOrderID]
    }
    !allStrategiesByBotIDAndOrderID[botID] && (allStrategiesByBotIDAndOrderID[botID] = {})
    !allStrategiesByBotIDAndStrategiesID[botID] && (allStrategiesByBotIDAndStrategiesID[botID] = {})

    allStrategiesByBotIDAndStrategiesID[botID][strategyID] = {
        "OC": {
            orderID: "",
            orderFilled: false,
            openTrade: "",
            dataSend: {},
        },
        "TP": {
            orderID: "",
            orderFilled: false,
            price: 0,
            qty: 0,
            side: "",
            priceCompare: 0,
            minMaxTempPrice: 0,
            coinClose: 0,
            moveAfterCompare: false,
            moveSuccess: false
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

    let BOT_TOKEN_RUN_TRADE = botListTelegram[telegramToken]

    try {
        if (!BOT_TOKEN_RUN_TRADE) {
            const newBotInit = new TelegramBot(telegramToken, {
                polling: false,
                // request: {
                //     agentOptions: {
                //         family: 4
                //     }
                // }
            })
            BOT_TOKEN_RUN_TRADE = newBotInit
            botListTelegram[telegramToken] = newBotInit
            // BOT_TOKEN_RUN_TRADE.launch();
        }
        for (let i = 0; i < retries; i++) {
            try {
                if (messageText) {
                    // await BOT_TOKEN_RUN_TRADE.telegram.sendMessage(telegramID, messageText);
                    await BOT_TOKEN_RUN_TRADE.sendMessage(telegramID, messageText, {
                        parse_mode: "HTML"
                    });
                    console.log('[->] Message sent to telegram successfully');
                    return;
                }
            } catch (error) {
                if (error.code === 429) {
                    const retryAfter = error.parameters.retry_after;
                    console.log(changeColorConsole.yellowBright(`[!] Rate limited. Retrying after ${retryAfter} seconds...`));
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                } else {
                    throw new Error("Send Telegram Error");
                }
            }
        }

        throw new Error('[!] Failed to send message after multiple retries');
    } catch (error) {
        console.log(changeColorConsole.redBright("[!] Bot Telegram Error"))
    } finally {
        await delay(200)
    }
};

const getMoneyFuture = async (botApiList) => {

    const resultGetFuture = await Promise.all(Object.values(botApiList).map(async botData => getFutureBE(botData.id)))

    if (resultGetFuture.length > 0) {
        resultGetFuture.forEach(data => {
            botAmountListObject[data.botID] = +data.totalWalletBalance
        })
    }
}

const handleSocketBotApiList = async (botApiList = {}) => {

    const objectToArray = Object.values(botApiList);
    const objectToArrayLength = objectToArray.length;
    console.log("[New-Bot-API] Length:", objectToArrayLength);

    if (objectToArrayLength > 0) {

        await getMoneyFuture(botApiList)

        console.log("[...] Subscribe new-bot-list-api successful\n");

        await Promise.allSettled(
            objectToArray.map(botApiData => {

                const ApiKey = botApiData.ApiKey
                const SecretKey = botApiData.SecretKey
                const botID = botApiData.id
                const botName = botApiData.botName

                // allSymbol.forEach(symbol => {
                //     resetMissData({
                //         botID,
                //         symbol: symbol.value
                //     })
                // })

                const wsConfigOrder = {
                    key: ApiKey,
                    secret: SecretKey,
                    market: 'v5',
                    recvWindow: 60000
                }

                const wsOrder = new WebsocketClient(wsConfigOrder);


                wsOrder.subscribeV5(LIST_ORDER, 'linear').catch(err => {
                    console.log(changeColorConsole.redBright(`[V] Subscribe order ${botID} error:`, err))
                })

                wsOrder.on('update', async (dataCoin) => {

                    const dataMain = dataCoin.data[0]
                    const symbol = dataMain.symbol
                    const orderID = dataMain.orderId
                    const orderStatus = dataMain.orderStatus

                    const botSymbolMissID = `${botID}-${symbol}`

                    // if (orderStatus === "Filled") {
                    //     console.log(changeColorConsole.greenBright("[Filled] first", symbol));
                    // }


                    if (dataCoin.topic === "order") {
                        const strategyData = allStrategiesByBotIDAndOrderID[botID]?.[orderID]

                        const strategy = strategyData?.strategy
                        const OCTrue = strategyData?.OC
                        const TPTrue = strategyData?.TP

                        if (strategy) {


                            const strategyID = strategy.value
                            const telegramID = strategy.botID.telegramID
                            const telegramToken = strategy.botID.telegramToken

                            if (orderStatus === "Filled") {

                                if (OCTrue) {

                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderFilled = true

                                    // Send telegram
                                    const openTrade = +dataMain.avgPrice  //Gia khop lenh

                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.openTrade = openTrade

                                    const sideText = strategy.PositionSide === "Long" ? "Buy" : "Sell"


                                    const qty = dataMain.qty

                                    const newOC = Math.abs((openTrade - strategy.coinOpen)) / strategy.coinOpen * 100
                                    // const newOC = strategy.OrderChange

                                    const priceOldOrder = (botAmountListObject[botID] * strategy.Amount / 100).toFixed(2)

                                    console.log(`\n[V] Filled OC: \n${symbol.replace("USDT", "")} | Open ${sideText} \nBot: ${botName} \nFT: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% -> ${newOC.toFixed(2)}% | TP: ${strategy.TakeProfit}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}\n`);
                                    const teleText = `<b>${symbol.replace("USDT", "")}</b> | Open ${sideText} \nBot: ${botName} \nFT: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% -> ${newOC.toFixed(2)}% | TP: ${strategy.TakeProfit}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}`

                                    if (!missTPDataBySymbol[botSymbolMissID]?.orderIDToDB) {

                                        const Quantity = dataMain.side === "Buy" ? qty : (qty * -1)

                                        const newDataToDB = {
                                            Symbol: symbol,
                                            Side: dataMain.side,
                                            Quantity,
                                            Price: openTrade,
                                        }

                                        console.log(`\n[Saving->Mongo] Position When Filled OC ( ${botName} - ${dataMain.side} - ${symbol} )`);

                                        await createPositionBE({
                                            ...newDataToDB,
                                            botID,
                                        }).then(async data => {
                                            console.log(data);
                                            console.log(data.message);
                                            const newID = data.id
                                            if (newID) {
                                                missTPDataBySymbol[botSymbolMissID].orderIDToDB = newID
                                            }
                                            else {
                                                await getPositionBySymbol({ symbol, botID }).then(data => {
                                                    console.log(data.message);
                                                    missTPDataBySymbol[botSymbolMissID].orderIDToDB = data.id
                                                }).catch(error => {
                                                    console.log(changeColorConsole.redBright(error));
                                                })
                                            }

                                        }).catch(err => {
                                            console.log(changeColorConsole.redBright(err));
                                        })
                                    }

                                    // Create TP

                                    let TPNew = 0

                                    if (strategy.PositionSide === "Long") {
                                        TPNew = openTrade + Math.abs((openTrade - strategy.coinOpen)) * (strategy.TakeProfit / 100)
                                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare = openTrade + Math.abs((openTrade - strategy.coinOpen)) * (40 / 100)
                                    }
                                    else {
                                        TPNew = openTrade - Math.abs((openTrade - strategy.coinOpen)) * (strategy.TakeProfit / 100)
                                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare = openTrade - Math.abs((openTrade - strategy.coinOpen)) * (40 / 100)
                                    }
                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.side = strategy.PositionSide === "Long" ? "Sell" : "Buy"

                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.price = TPNew



                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.qty = qty


                                    // console.log("price",dataMain.price);
                                    // console.log("avgPrice",dataMain.avgPrice);
                                    // console.log("openTrade",openTrade);
                                    // console.log("TPNew",TPNew);

                                    const dataInput = {
                                        strategy,
                                        strategyID,
                                        symbol,
                                        qty,
                                        // price: TPNew,
                                        price: TPNew.toFixed(strategy.digit),
                                        side: strategy.PositionSide === "Long" ? "Sell" : "Buy",
                                        candle: strategy.Candlestick,
                                        ApiKey,
                                        SecretKey,
                                        botName,
                                        botID
                                    }

                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.dataSend = dataInput

                                    handleSubmitOrderTP(dataInput)

                                    sendMessageWithRetry({
                                        messageText: teleText,
                                        telegramID,
                                        telegramToken,
                                    })
                                }
                                // Khớp TP
                                if (TPTrue) {

                                    const closePrice = +dataMain.avgPrice

                                    const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"

                                    const openTradeOCFilled = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC.openTrade

                                    const qty = +dataMain.qty
                                    const priceOldOrder = (botAmountListObject[botID] * strategy.Amount / 100).toFixed(2)


                                    console.log(`\n[V] Filled TP: \n${symbol.replace("USDT", "")} | Close ${side} \nBot: ${botName} \nFT: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% | TP: ${strategy.TakeProfit}% \nPrice: ${closePrice} | Amount: ${priceOldOrder}`);
                                    const teleText = `<b>${symbol.replace("USDT", "")}</b> | Close ${side} \nBot: ${botName} \nFT: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% | TP: ${strategy.TakeProfit}% \nPrice: ${closePrice} | Amount: ${priceOldOrder}`

                                    const priceWinPercent = (Math.abs(closePrice - openTradeOCFilled) / openTradeOCFilled * 100).toFixed(2) || 0;
                                    const priceWin = ((closePrice - openTradeOCFilled) * qty).toFixed(2) || 0;

                                    let textWinLose = ""

                                    if (side === "Buy") {
                                        if (priceWin > 0 && priceWinPercent > 0) {
                                            textWinLose = `\n✅ [WIN - Buy]: ${priceWin} | ${priceWinPercent}%\n`
                                            console.log(changeColorConsole.greenBright(textWinLose));
                                        }
                                        else {
                                            textWinLose = `\n❌ [LOSE - Buy]: ${priceWin} | ${priceWinPercent}%\n`
                                            console.log(changeColorConsole.magentaBright(textWinLose));
                                        }
                                    }
                                    else {
                                        if (priceWin > 0 && priceWinPercent > 0) {
                                            textWinLose = `\n❌ [LOSE - SELL]: ${-1 * priceWin} | ${priceWinPercent}%\n`
                                            console.log(changeColorConsole.magentaBright(textWinLose));
                                        }
                                        else {
                                            textWinLose = `\n✅ [WIN - SELL]: ${Math.abs(priceWin)} | ${priceWinPercent}%\n`
                                            console.log(changeColorConsole.greenBright(textWinLose));
                                        }
                                    }

                                    missTPDataBySymbol[botSymbolMissID].size -= Math.abs(qty)

                                    // Fill toàn bộ
                                    if (missTPDataBySymbol[botSymbolMissID]?.sizeTotal == qty || missTPDataBySymbol[botSymbolMissID]?.size == 0) {
                                        // 
                                        console.log(`[_FULL Filled_] Filled TP ( ${side} - ${symbol} - ${strategy.Candlestick} )`);

                                        missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)

                                        if (missTPDataBySymbol[botSymbolMissID]?.orderIDToDB) {
                                            console.log(`[_Mongo_] Delete Position ( ${side} - ${symbol} - ${strategy.Candlestick} )`);
                                            deletePositionBE({
                                                orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                            }).then(message => {
                                                console.log(message);
                                            }).catch(err => {
                                                console.log(changeColorConsole.redBright(err));
                                            })
                                        }

                                        console.log("[...] Reset All");

                                        resetMissData({
                                            botID,
                                            symbol,
                                        })

                                    }
                                    else {
                                        console.log(`[_Part Filled_] Filled TP ( ${side} - ${symbol} - ${strategy.Candlestick} )`);
                                    }

                                    cancelAll({ strategyID, botID })

                                    sendMessageWithRetry({
                                        messageText: `${teleText} \n${textWinLose}`,
                                        telegramID,
                                        telegramToken,
                                    })


                                }
                            }

                            else if (orderStatus === "Cancelled") {
                                // console.log("[X] Cancelled");
                                // Khớp TP
                                if (TPTrue) {
                                    console.log(`[-] Cancelled TP ( ${strategy.PositionSide === "Long" ? "Sell" : "Buy"} - ${symbol} - ${strategy.Candlestick} ) - Chốt lời `);
                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = ""
                                }
                                else if (OCTrue) {
                                    console.log(`[-] Cancelled OC ( ${strategy.PositionSide === "Long" ? "Sell" : "Buy"} - ${symbol} - ${strategy.Candlestick}) `);
                                    cancelAll({ strategyID, botID })
                                }

                            }
                        }
                    }
                    // User cancel vị thế
                    if (dataMain.orderType === "Market") {
                        const side = dataMain.side
                        console.log('[...] User Clicked Close Vị Thế')
                        missTPDataBySymbol[botSymbolMissID]?.orderIDOfListTP?.length > 0 &&
                            await Promise.all(missTPDataBySymbol[botSymbolMissID]?.orderIDOfListTP.map(orderIdTPData => {
                                return handleCancelOrderTP({
                                    ApiKey,
                                    SecretKey,
                                    strategyID: orderIdTPData?.strategyID,
                                    symbol,
                                    side,
                                    orderId: orderIdTPData?.orderID,
                                    botID,
                                    botName
                                })
                            }))


                        if (missTPDataBySymbol[botSymbolMissID]?.orderID) {
                            console.log(`[...] Cancel Position MISS`);
                            handleCancelOrderTP(
                                {
                                    strategyID,
                                    symbol: strategy.symbol,
                                    side,
                                    orderId: missTPDataBySymbol[botSymbolMissID].orderID,
                                    candle: strategy.Candlestick,
                                    ApiKey,
                                    SecretKey,
                                    botName,
                                    botID
                                }
                            )
                        }

                        if (missTPDataBySymbol[botSymbolMissID]?.orderIDToDB) {
                            console.log(`[_Mongo_] Delete Position ( ${side} - ${symbol})`);
                            deletePositionBE({
                                orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                            }).then(message => {
                                console.log(message);
                            }).catch(err => {
                                console.log(changeColorConsole.redBright(err));
                            })
                        }
                    }

                    else if (dataCoin.topic === "position") {

                        const size = Math.abs(dataMain.size)

                        // if (size > 0 && strategy.Candlestick === missTPDataBySymbol[botSymbolMissID].Candlestick) {
                        !missTPDataBySymbol[botSymbolMissID] && resetMissData({ botID, symbol })

                        if (size > 0) {
                            missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)
                            missTPDataBySymbol[botSymbolMissID].timeOutFunc = setTimeout(async () => {

                                const dataMain = dataCoin.data[0]
                                const symbol = dataMain.symbol
                                const side = dataMain.side
                                const openTrade = +dataMain.entryPrice  //Gia khop lenh

                                const missSize = size - missTPDataBySymbol[botSymbolMissID].size

                                missTPDataBySymbol[botSymbolMissID].sizeTotal = size

                                const Quantity = side === "Buy" ? size : (size * -1)


                                if (!missTPDataBySymbol[botSymbolMissID]?.orderIDToDB) {

                                    const newDataToDB = {
                                        Symbol: symbol,
                                        Side: side,
                                        Quantity,
                                        Price: openTrade,
                                        Pnl: dataMain.unrealisedPnl,
                                    }

                                    console.log(`\n[Saving->Mongo] Position When Check Miss ( ${botName} - ${side} - ${symbol} )`);

                                    await createPositionBE({
                                        ...newDataToDB,
                                        botID,
                                    }).then(async data => {
                                        console.log(data);
                                        console.log(data.message);
                                        const newID = data.id
                                        !missTPDataBySymbol[botSymbolMissID] && resetMissData({ botID, symbol })

                                        if (newID) {
                                            missTPDataBySymbol[botSymbolMissID].orderIDToDB = newID
                                        }
                                        else {
                                            await getPositionBySymbol({ symbol, botID }).then(data => {
                                                console.log(data.message);
                                                missTPDataBySymbol[botSymbolMissID].orderIDToDB = data.id
                                            }).catch(error => {
                                                console.log(changeColorConsole.redBright(error));
                                            })
                                        }

                                    }).catch(err => {
                                        console.log(changeColorConsole.redBright(err));
                                    })
                                }

                                if (!missTPDataBySymbol[botSymbolMissID]?.gongLai) {
                                    if (missSize > 0) {

                                        if (!missTPDataBySymbol[botSymbolMissID]?.orderID) {

                                            console.log(changeColorConsole.redBright(`\n[_ MISS _] TP ( ${botName} - ${side} - ${symbol} ): ${missSize}\n`));

                                            // const TPNew = missTPDataBySymbol[botSymbolMissID].priceOrderTP
                                            let TPNew = openTrade

                                            if (side === "Buy") {
                                                TPNew = openTrade + (openTrade * 3 / 100) * (50 / 100)
                                            }
                                            else {
                                                TPNew = openTrade - (openTrade * 3 / 100) * (50 / 100)
                                            }

                                            missTPDataBySymbol[botSymbolMissID].prePrice = TPNew
                                            missTPDataBySymbol[botSymbolMissID].side = side

                                            const dataInput = {
                                                symbol,
                                                qty: missSize.toString(),
                                                price: TPNew.toFixed(digitAllCoinObject[symbol]),
                                                side: side === "Buy" ? "Sell" : "Buy",
                                                ApiKey,
                                                SecretKey,
                                                missState: true,
                                                botName,
                                                botID,
                                            }

                                            // console.log("[ Re-TP ] Order TP Miss");

                                            // handleSubmitOrderTP(dataInput)

                                            updatePositionBE({
                                                newDataUpdate: {
                                                    Miss: true
                                                },
                                                orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                            }).then(message => {
                                                console.log(message);
                                            }).catch(err => {
                                                console.log(err);
                                                missTPDataBySymbol[botSymbolMissID].orderIDToDB = ""
                                            })
                                        }
                                    }
                                    else {
                                        console.log(`[_ Not Miss _] TP ( ${botName} - ${side} - ${symbol}} )`);
                                        console.log(`[_Mongo_] UPDATE MISS Position ( ${botName} - ${side} - ${symbol} )`);
                                        updatePositionBE({
                                            newDataUpdate: {
                                                Miss: false,
                                                TimeUpdated: new Date()
                                            },
                                            orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                        }).then(message => {
                                            console.log(message);
                                        }).catch(err => {
                                            console.log(changeColorConsole.redBright(err));
                                        })
                                    }
                                }
                                else {
                                    console.log(changeColorConsole.redBright(`\n[_ MISS _] TP ( ${botName} - ${side} - ${symbol} ): ${missSize}\n`));
                                    console.log(`[_Mongo_] UPDATE MISS Position ( ${botName} - ${side} - ${symbol} )`);
                                    updatePositionBE({
                                        newDataUpdate: {
                                            Miss: true,
                                            TimeUpdated: new Date()
                                        },
                                        orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                    }).then(message => {
                                        console.log(message);
                                    }).catch(err => {
                                        console.log(changeColorConsole.redBright(err));
                                    })
                                }

                            }, 3000)
                        }
                        else {
                            missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)
                        }
                    }
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
        )
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


    let allStrategiesActiveBE = getAllStrategiesActive()
    let allSymbolBE = getAllSymbolBE()

    const result = await Promise.all([allStrategiesActiveBE, allSymbolBE])

    const allStrategiesActiveObject = result[0]
    allSymbol = result[1]

    allStrategiesActiveObject.forEach(strategyItem => {
        if (checkConditionBot(strategyItem)) {

            const strategyID = strategyItem.value
            const botID = strategyItem.botID._id
            const botName = strategyItem.botID.botName
            const symbol = strategyItem.symbol
            const Candlestick = strategyItem.Candlestick.split("")[0]

            if (!botApiList[botID]) {
                botApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey: strategyItem.botID.ApiKey,
                    SecretKey: strategyItem.botID.SecretKey,
                }
            }

            !allStrategiesByBotIDAndOrderID[botID] && (allStrategiesByBotIDAndOrderID[botID] = {})
            !allStrategiesByBotIDAndStrategiesID[botID] && (allStrategiesByBotIDAndStrategiesID[botID] = {})


            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {})
            !allStrategiesByCandleAndSymbol[symbol][Candlestick] && (allStrategiesByCandleAndSymbol[symbol][Candlestick] = {})
            allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID] = strategyItem
        }
    })

    await Promise.all(allSymbol.map(async symbol => {
        let result = await Digit(symbol.value)
        digitAllCoinObject[symbol.value] = result[0]
    }))

    listKline = allSymbol.flatMap(symbolItem => ([
        `kline.1.${symbolItem.value}`,
        `kline.3.${symbolItem.value}`,
        `kline.5.${symbolItem.value}`,
        `kline.15.${symbolItem.value}`,
    ]))

    allSymbol.forEach(item => {
        const symbol = item.value
        const listKlineNumber = [1, 3, 5, 15]
        listKlineNumber.forEach(candle => {
            const symbolCandleID = `${symbol}-${candle}`


            listPricePreOne[symbolCandleID] = {
                open: 0,
                close: 0,
                high: 0,
                low: 0,
            }
            trichMauOCListObject[symbolCandleID] = {
                maxPrice: 0,
                minPrice: [],
                prePrice: 0,
                coinColor: []
            }
            trichMauTPListObject[symbolCandleID] = {
                maxPrice: 0,
                minPrice: [],
                prePrice: 0,
            }
        })
    })

    // ORDER
    await handleSocketBotApiList(botApiList)



    // KLINE
    await wsSymbol.subscribeV5(listKline, 'linear').then(() => {

        console.log("[V] Subscribe kline successful\n");

        wsSymbol.on('update', async (dataCoin) => {


            const topic = dataCoin.topic
            const topicSplit = topic.split(".")
            const candle = topicSplit[1]
            const symbol = topicSplit[2]

            const dataMain = dataCoin.data[0]
            const coinOpen = +dataMain.open
            const coinCurrent = +dataMain.close

            const listData = allStrategiesByCandleAndSymbol?.[symbol]?.[candle]

            listData && Object.values(listData)?.length > 0 && await Promise.allSettled(Object.values(listData).map(async strategy => {

                if (checkConditionBot(strategy)) {

                    const strategyID = strategy.value

                    strategy.digit = digitAllCoinObject[strategy.symbol]
                    strategy.coinOpen = coinOpen

                    const botID = strategy.botID._id
                    const botName = strategy.botID.botName

                    const ApiKey = strategy.botID.ApiKey
                    const SecretKey = strategy.botID.SecretKey
                    const telegramID = strategy.botID.telegramID
                    const telegramToken = strategy.botID.telegramToken

                    const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"

                    const symbolCandleID = `${symbol}-${candle}`

                    if (dataMain.confirm == false) {
                        if (!allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderID && strategy.IsActive) {
                            setTimeout(() => {


                                const khoangGia = Math.abs(coinCurrent - trichMauOCListObject[symbolCandleID].prePrice)

                                // X-D-D || D-D-D


                                const coinColor = coinCurrent - trichMauOCListObject[symbolCandleID].prePrice > 0 ? "Blue" : "Red"

                                let checkColorListTrue = false

                                const coinColorPre = trichMauOCListObject[symbolCandleID].coinColor

                                if (coinColorPre.length > 0) {
                                    checkColorListTrue = coinColor === "Red"
                                }
                                else {
                                    checkColorListTrue = true
                                }

                                if (khoangGia > trichMauOCListObject[symbolCandleID].maxPrice) {
                                    trichMauOCListObject[symbolCandleID].maxPrice = khoangGia
                                    trichMauOCListObject[symbolCandleID].minPrice = []
                                    trichMauOCListObject[symbolCandleID].coinColor = []
                                }
                                else {
                                    if (khoangGia <= trichMauOCListObject[symbolCandleID].maxPrice / 4) {
                                        if (trichMauOCListObject[symbolCandleID].minPrice.length === 3) {
                                            trichMauOCListObject[symbolCandleID].minPrice.shift()
                                        }
                                        trichMauOCListObject[symbolCandleID].minPrice.push(coinColor)
                                    }
                                }
                                if (checkColorListTrue) {
                                    if (trichMauOCListObject[symbolCandleID].coinColor.length === 3) {
                                        trichMauOCListObject[symbolCandleID].coinColor.shift()
                                    }
                                    trichMauOCListObject[symbolCandleID].coinColor.push(coinColor)
                                }

                                if (!checkColorListTrue) {
                                    trichMauOCListObject[symbolCandleID].coinColor = []
                                }
                                else {
                                    if (trichMauOCListObject[symbolCandleID].coinColor.length === 3) {
                                        trichMauOCListObject[symbolCandleID].coinColor.shift()
                                    }
                                    trichMauOCListObject[symbolCandleID].coinColor.push(coinColor)
                                }

                                trichMauOCListObject[symbolCandleID].prePrice = coinCurrent

                                // if (trichMauOCListObject[symbolCandleID].coinColor.length === 3) {
                                if (trichMauOCListObject[symbolCandleID].minPrice.length === 3 && trichMauOCListObject[symbolCandleID].coinColor.length === 3) {
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
                                        strategy,
                                        strategyID,
                                        ApiKey,
                                        SecretKey,
                                        symbol,
                                        qty,
                                        side,
                                        price: priceOrder.toFixed(strategy.digit),
                                        candle: strategy.Candlestick,
                                        botName,
                                        botID,
                                        telegramID,
                                        telegramToken
                                    }

                                    if (side === "Buy") {
                                        +conditionOrder >= coinCurrent && (coinOpen - coinCurrent) > 0 && conditionPre && handleSubmitOrder(dataInput)
                                    }
                                    else {
                                        +conditionOrder <= coinCurrent && (coinOpen - coinCurrent) < 0 && conditionPre && handleSubmitOrder(dataInput)
                                    }
                                }

                            }, 250)
                        }
                        else {
                            // if have TP
                            if (allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID && !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.moveAfterCompare) {
                                let checkMoveMain = false || allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveSuccess

                                if (!checkMoveMain) {
                                    const PercentCheck = 2 / 100
                                    const sideCheck = allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.side

                                    const openTrade = allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.coinClose || allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.openTrade

                                    !allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice && (allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice = coinCurrent)

                                    // console.log(changeColorConsole.cyanBright(`priceCompare ( ${botName} - ${side} - ${symbol} - ${candle} ) `, allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare));
                                    let textQuanSat = ``
                                    let textQuayDau = ``
                                    if (sideCheck === "Buy") {
                                        if ((coinCurrent < allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare)) {
                                            textQuanSat = `🙈 Vào khoảng theo dõi ( ${botName} - ${side} - ${symbol} - ${candle} ) `
                                            console.log(changeColorConsole.cyanBright(textQuanSat));
                                            sendMessageWithRetry({
                                                messageText: textQuanSat,
                                                telegramID,
                                                telegramToken
                                            })
                                            if (coinCurrent > allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice + Math.abs(openTrade - allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice) * PercentCheck) {
                                                textQuayDau = `\n😎 Quay đầu ( ${botName} - ${side} - ${symbol} - ${candle} )\n`
                                                console.log(changeColorConsole.greenBright(textQuayDau));
                                                sendMessageWithRetry({
                                                    messageText: textQuayDau,
                                                    telegramID,
                                                    telegramToken
                                                })
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveAfterCompare = true
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveSuccess = true
                                                checkMoveMain = true
                                            }
                                        }
                                    }
                                    else {
                                        if ((coinCurrent > allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare)) {
                                            textQuanSat = `🙈 Vào khoảng theo dõi ( ${botName} - ${side} - ${symbol} - ${candle} ) `
                                            console.log(changeColorConsole.cyanBright(textQuanSat));
                                            sendMessageWithRetry({
                                                messageText: textQuanSat,
                                                telegramID,
                                                telegramToken
                                            })
                                            if (coinCurrent < allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice - Math.abs(openTrade - allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice) * PercentCheck) {
                                                textQuayDau = `\n😎 Quay đầu ( ${botName} - ${side} - ${symbol} - ${candle} )\n`
                                                console.log(changeColorConsole.greenBright(textQuayDau));
                                                sendMessageWithRetry({
                                                    messageText: textQuayDau,
                                                    telegramID,
                                                    telegramToken
                                                })
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveAfterCompare = true
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveSuccess = true
                                                checkMoveMain = true
                                            }
                                        }
                                    }
                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice = coinCurrent

                                }
                                if (checkMoveMain) {
                                    // console.log(changeColorConsole.cyanBright(`Price Move TP Compare ( ${botName} - ${side} - ${symbol} - ${candle} ):`, coinCurrent));
                                    const client = new RestClientV5({
                                        testnet: false,
                                        key: ApiKey,
                                        secret: SecretKey,
                                        recv_window: 60000,
                                        enable_time_sync: true
                                    });
                                    client
                                        .amendOrder({
                                            category: 'linear',
                                            symbol,
                                            price: coinCurrent.toFixed(strategy.digit),
                                            orderId: allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID
                                        })
                                        .then(async (response) => {
                                            if (response.retCode == 0) {
                                                console.log(changeColorConsole.blueBright(`[->] Move Order TP Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) successful`))
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = response.result.orderId
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveAfterCompare = false
                                                await delay(200)
                                            }
                                            else {
                                                console.log(changeColorConsole.yellowBright(`[!] Move Order TP Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) failed `, response.retMsg))
                                            }
                                        })
                                        .catch((error) => {
                                            console.log(changeColorConsole.redBright(`[!] Move Order TP Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) error `, error))
                                        });
                                }

                            }
                        }
                        // else if (allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.OC.orderFilled) {
                        //     if (!allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.TP.orderID && !allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.TP.orderingStatus && allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.OC?.dataSend?.price) {
                        //         setTimeout(() => {

                        //             const coinCurrent = +dataMain.close

                        //             const khoangGia = Math.abs(coinCurrent - trichMauTPListObject[symbolCandleID].prePrice)

                        //             if (khoangGia > trichMauTPListObject[symbolCandleID].maxPrice) {
                        //                 trichMauTPListObject[symbolCandleID].maxPrice = khoangGia
                        //                 trichMauTPListObject[symbolCandleID].minPrice = []
                        //             }
                        //             else {
                        //                 if (khoangGia <= trichMauTPListObject[symbolCandleID].maxPrice / 4) {
                        //                     if (trichMauTPListObject[symbolCandleID].minPrice.length === 3) {
                        //                         trichMauTPListObject[symbolCandleID].minPrice.shift()
                        //                     }
                        //                     trichMauTPListObject[symbolCandleID].minPrice.push(khoangGia)
                        //                 }
                        //             }
                        //             trichMauTPListObject[symbolCandleID].prePrice = coinCurrent


                        //             let priceOrder = allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.OC.dataSend.price

                        //             if (trichMauTPListObject[symbolCandleID].minPrice.length === 3) {
                        //                 if (side === "Buy") {
                        //                     if (coinCurrent >= priceOrder) {
                        //                         priceOrder = coinCurrent
                        //                     }
                        //                 }
                        //                 else {
                        //                     if (coinCurrent <= priceOrder) {
                        //                         priceOrder = coinCurrent
                        //                     }
                        //                 }
                        //             }

                        //             handleSubmitOrderTP({
                        //                 ...allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.OC.dataSend,
                        //                 price: priceOrder.toFixed(strategy.digit)
                        //             })

                        //         }, 250)
                        //     }
                        // }

                    }
                    // Coin CLosed
                    else if (dataMain.confirm == true) {

                        const coinClose = +dataMain.close

                        listPricePreOne[symbolCandleID] = {
                            open: +dataMain.open,
                            close: coinClose,
                            high: +dataMain.high,
                            low: +dataMain.low,
                        }

                        // console.log(` New Candle ${strategy.PositionSide} `)
                        allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderID &&
                            !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled &&
                            handleCancelOrderOC(
                                {
                                    strategyID,
                                    symbol: strategy.symbol,
                                    candle: strategy.Candlestick,
                                    side,
                                    ApiKey,
                                    SecretKey,
                                    botName,
                                    botID
                                }
                            )

                        // TP chưa khớp -> Dịch TP mới

                        if (allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP.orderID) {

                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.coinClose = coinClose

                            let newPriceCompare = 0
                            const oldPriceCompare = allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare
                            if (strategy.PositionSide === "Long") {
                                newPriceCompare = oldPriceCompare - Math.abs(oldPriceCompare - coinClose) * (strategy.ReduceTakeProfit / 100)
                            }
                            else {
                                newPriceCompare = oldPriceCompare + Math.abs(oldPriceCompare - coinClose) * (strategy.ReduceTakeProfit / 100)
                            }

                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare = newPriceCompare


                            !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID].TP.moveSuccess && handleMoveOrderTP({
                                ApiKey,
                                SecretKey,
                                strategyID,
                                strategy,
                                candle: strategy.Candlestick,
                                side,
                                coinOpen: coinClose,
                                botName,
                                botID
                            })
                        }

                        trichMauOCListObject[symbolCandleID] = {
                            maxPrice: 0,
                            minPrice: [],
                            prePrice: 0,
                            coinColor: []
                        }

                    }
                }

            }))

            // Xử lý miss

            // if (dataMain.confirm == true && topic.includes(`kline.1`)) {

            //     const coinClose = +dataMain.close

            //     Object.values(missTPDataBySymbol).map(missData => {

            //         const botName = missData.botName
            //         const botID = missData.botID

            //         const botSymbolMissID = `${botID}-${symbol}`

            //         // TP chưa khớp -> Dịch TP MISS mới
            //         if (missTPDataBySymbol[botSymbolMissID]?.orderID && !missTPDataBySymbol[botSymbolMissID]?.gongLai) {

            //             const TPOld = +missData.prePrice

            //             let TPNew

            //             if (missData.side === "Buy") {
            //                 TPNew = TPOld - Math.abs(TPOld - coinClose) * (50 / 100)
            //             }
            //             else {
            //                 TPNew = TPOld + Math.abs(TPOld - coinClose) * (50 / 100)
            //             }

            //             missTPDataBySymbol[botSymbolMissID].prePrice = TPNew

            //             const client = new RestClientV5({
            //                 testnet: false,
            //                 key: missData.ApiKey,
            //                 secret: missData.SecretKey,
            // recv_window:60000,
            // enable_time_sync:true 
            //             });
            //             client
            //                 .amendOrder({
            //                     category: 'linear',
            //                     symbol,
            //                     price: TPNew.toFixed(digitAllCoinObject[symbol]),
            //                     orderId: missData.orderID,
            //                 })
            //                 .then((response) => {
            //                     if (response.retCode == 0) {
            //                         console.log(`[->] Move Order TP Miss ( ${botName} - ${symbol} ) successful`)
            //                         missTPDataBySymbol[botSymbolMissID].orderID = response.result.orderId
            //                     }
            //                     else {
            //                         console.log(changeColorConsole.yellowBright(`[!] Move Order TP Miss ( ${botName} - ${symbol} ) failed `, response.retMsg))
            //                         missTPDataBySymbol[botSymbolMissID].orderID = ""
            //                     }
            //                 })
            //                 .catch((error) => {
            //                     console.log(changeColorConsole.redBright(`[!] Move Order TP Miss ( ${botName} - ${symbol} ) error `, error))
            //                     missTPDataBySymbol[botSymbolMissID].orderID = ""
            //                 });
            //         }
            //     })
            // }

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
        console.log(changeColorConsole.redBright("[!] Subscribe kline error:", err));
    })

    cron.schedule(`*/1 * * * * *`, () => {
        Object.values(botApiList).map(botItem => {
            getMoneyFuture([botItem])
        })
    });

}

try {
    Main()

}

catch (e) {
    console.log(changeColorConsole.red("[!] Error Main:", e));
}


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
            const botName = newStrategiesData.botID.botName
            const Candlestick = newStrategiesData.Candlestick.split("")[0]

            const ApiKey = newStrategiesData.botID.ApiKey
            const SecretKey = newStrategiesData.botID.SecretKey

            cancelAll({ strategyID, botID })


            if (!botApiList[botID]) {
                botApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                }
                newBotApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey
                }
            }

            !allStrategiesByBotIDAndOrderID[botID] && (allStrategiesByBotIDAndOrderID[botID] = {})
            !allStrategiesByBotIDAndStrategiesID[botID] && (allStrategiesByBotIDAndStrategiesID[botID] = {})


            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {})
            !allStrategiesByCandleAndSymbol[symbol][Candlestick] && (allStrategiesByCandleAndSymbol[symbol][Candlestick] = {})
            allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID] = newStrategiesData
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
            const botName = strategiesData.botID.botName

            const symbol = strategiesData.symbol
            const strategyID = strategiesData.value
            const IsActive = strategiesData.IsActive
            const Candlestick = strategiesData.Candlestick.split("")[0]


            const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

            const botSymbolMissID = `${botID}-${symbol}`

            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {})
            !allStrategiesByCandleAndSymbol[symbol][Candlestick] && (allStrategiesByCandleAndSymbol[symbol][Candlestick] = {})
            allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID] = strategiesData

            if (IsActive) {
                if (!botApiList[botID]) {

                    botApiList[botID] = {
                        id: botID,
                        botName,
                        ApiKey,
                        SecretKey
                    }
                    newBotApiList[botID] = {
                        id: botID,
                        botName,
                        ApiKey,
                        SecretKey
                    }
                }
            }


            const cancelDataObject = {
                ApiKey,
                SecretKey,
                strategyID,
                symbol: symbol,
                candle: strategiesData.Candlestick,
                side,
                botName,
                botID
            }

            const OCOrderID = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.orderID

            if (OCOrderID || !strategiesData.IsActive) {
                OCOrderID && handleCancelOrderOC(cancelDataObject)
                if (!strategiesData.IsActive) {
                    const TPOrderID = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID
                    const TPMissOrderID = missTPDataBySymbol[botSymbolMissID]?.orderID
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
                await delay(200)
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
            const botName = strategiesData.botID.botName
            const Candlestick = strategiesData.Candlestick.split("")[0]

            const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

            const botSymbolMissID = `${botID}-${symbol}`

            const cancelDataObject = {
                ApiKey,
                SecretKey,
                strategyID,
                symbol: symbol,
                candle: strategiesData.Candlestick,
                side,
                botName,
                botID
            }


            const OCOrderID = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.orderID
            const TPOrderID = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID
            const TPMissOrderID = missTPDataBySymbol[botSymbolMissID]?.orderID

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
            delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
            delete allStrategiesByCandleAndSymbol[symbol]?.[Candlestick]?.[strategyID]
        }
    })

});


socketRealtime.on('bot-update', async (data = {}) => {
    const { newData, botIDMain, botActive } = data;

    console.log("[...] Bot-Update Strategies From Realtime", newData.length);

    const newBotApiList = {}

    newData.map(async strategiesData => {


        const ApiKey = strategiesData.botID.ApiKey
        const SecretKey = strategiesData.botID.SecretKey
        const botID = strategiesData.botID._id
        const botName = strategiesData.botID.botName


        const symbol = strategiesData.symbol
        const strategyID = strategiesData.value
        const IsActive = strategiesData.IsActive
        const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"
        const Candlestick = strategiesData.Candlestick.split("")[0]

        const botSymbolMissID = `${botID}-${symbol}`

        !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {})
        !allStrategiesByCandleAndSymbol[symbol][Candlestick] && (allStrategiesByCandleAndSymbol[symbol][Candlestick] = {})
        allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID] = strategiesData

        const cancelDataObject = {
            ApiKey,
            SecretKey,
            strategyID,
            symbol: symbol,
            candle: strategiesData.Candlestick,
            side,
            botName,
            botID
        }
        if (IsActive) {
            if (!botApiList[botID]) {

                botApiList[botID] = {
                    id: botID,
                    ApiKey,
                    SecretKey,
                    botName
                }
                newBotApiList[botID] = {
                    id: botID,
                    ApiKey,
                    SecretKey,
                    botName
                }
            }
        }

        const OCOrderID = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.orderID

        if (OCOrderID || !strategiesData.IsActive) {
            OCOrderID && handleCancelOrderOC(cancelDataObject)
            if (!strategiesData.IsActive) {
                const TPOrderID = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID
                const TPMissOrderID = missTPDataBySymbol[botSymbolMissID]?.orderID
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

    const botApiData = botApiList[botIDMain]

    if (botApiData) {
        const ApiKeyBot = botApiData.ApiKey
        const SecretKeyBot = botApiData.SecretKey

        const wsConfigOrder = {
            key: ApiKeyBot,
            secret: SecretKeyBot,
            market: 'v5',
            recvWindow: 60000
        }

        const wsOrder = new WebsocketClient(wsConfigOrder);

        if (botActive) {
            await wsOrder.subscribeV5(LIST_ORDER, 'linear')
        }
        else {
            await wsOrder.unsubscribeV5(LIST_ORDER, 'linear')
        }
    }
    else {
        await handleSocketBotApiList(newBotApiList)
    }

});

socketRealtime.on('bot-api', async (data) => {
    const { newData, botID: botIDMain, newApiData } = data;
    console.log("[...] Bot-Api Update Strategies From Realtime", newData.length);

    newData.map(async strategiesData => {

        if (checkConditionBot(strategiesData)) {
            const strategyID = strategiesData.value
            const symbol = strategiesData.symbol
            const ApiKey = strategiesData.botID.ApiKey
            const SecretKey = strategiesData.botID.SecretKey
            const botID = strategiesData.botID._id
            const botName = strategiesData.botID.botName
            const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

            const OCOrderID = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.orderID
            const TPOrderID = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID

            const botSymbolMissID = `${botID}-${symbol}`

            const TPMissOrderID = missTPDataBySymbol[botSymbolMissID]?.orderID

            const cancelDataObject = {
                ApiKey,
                SecretKey,
                strategyID,
                symbol: symbol,
                candle: strategiesData.Candlestick,
                side,
                botName,
                botID
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
            recvWindow: 60000
        }

        const wsOrder = new WebsocketClient(wsConfigOrder);

        await wsOrder.unsubscribeV5(LIST_ORDER, 'linear')

        botApiList[botIDMain] = {
            ...botApiList[botIDMain],
            ApiKey: newApiData.ApiKey,
            SecretKey: newApiData.SecretKey,
        }

        const wsConfigOrderNew = {
            key: newApiData.ApiKey,
            secret: newApiData.SecretKey,
            market: 'v5',
            recvWindow: 60000
        }

        const wsOrderNew = new WebsocketClient(wsConfigOrderNew);

        await wsOrderNew.subscribeV5(LIST_ORDER, 'linear')

    } catch (error) {
        console.log(changeColorConsole.redBright("[!] Error subscribeV5", error));
    }

});

socketRealtime.on('bot-delete', (data) => {
    const { newData, botID: botIDMain } = data;
    console.log("[...] Bot Deleted Strategies From Realtime");

    newData.map(async strategiesData => {
        if (checkConditionBot(strategiesData)) {

            const ApiKey = strategiesData.botID.ApiKey
            const SecretKey = strategiesData.botID.SecretKey

            const symbol = strategiesData.symbol
            const strategyID = strategiesData.value
            const botID = strategiesData.botID._id
            const botName = strategiesData.botID.botName

            const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"
            const Candlestick = strategiesData.Candlestick.split("")[0]

            const botSymbolMissID = `${botID}-${symbol}`


            const cancelDataObject = {
                ApiKey,
                SecretKey,
                strategyID,
                symbol: symbol,
                candle: strategiesData.Candlestick,
                side,
                botName,
                botID
            }


            const OCOrderID = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC?.orderID
            const TPOrderID = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID
            const TPMissOrderID = missTPDataBySymbol[botSymbolMissID]?.orderID

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
            delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
            delete allStrategiesByCandleAndSymbol[symbol]?.[Candlestick]?.[strategyID]
        }
    })

    const botApiData = botApiList[botIDMain]
    const ApiKeyBot = botApiData.ApiKey
    const SecretKeyBot = botApiData.SecretKey

    const wsConfigOrder = {
        key: ApiKeyBot,
        secret: SecretKeyBot,
        market: 'v5',
        recvWindow: 60000
    }

    const wsOrder = new WebsocketClient(wsConfigOrder);

    wsOrder.unsubscribeV5(LIST_ORDER, 'linear')

    delete botApiList[botIDMain]

});

socketRealtime.on('bot-telegram', async (data) => {
    console.log("[...] Bot Telegram Update From Realtime");

    const { newData, botID: botIDMain, newApiData } = data;
    const telegramTokenOld = newApiData.telegramTokenOld
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
            allStrategiesByBotIDAndStrategiesID[botIDMain][strategyID] = newStrategiesDataUpdate
        }
    })

    if (botListTelegram[telegramTokenOld]) {
        botListTelegram[telegramTokenOld]?.stopPolling()
        delete botListTelegram[telegramTokenOld]
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

    })


    wsSymbol.subscribeV5(newListKline, 'linear').then(() => {
        console.log("[V] Subscribe New Kline Successful\n");
    }).catch(err => {
        console.log(changeColorConsole.redBright("[!] Subscribe  New Kline Error:", err));
    })
});

socketRealtime.on("close-limit", async (data) => {
    const botName = positionData.BotName
    console.log(`[...] Close Limit ( ${botName} )`);
    const { positionData } = data
    const symbol = positionData.Symbol
    const botID = positionData.botID

    const botSymbolMissID = `${botID}-${symbol}`

    await Promise.all(missTPDataBySymbol[botSymbolMissID]?.orderIDOfListTP.map(orderIdTPData => {
        return handleCancelOrderTP({
            ApiKey: positionData.botData.ApiKey,
            SecretKey: positionData.botData.SecretKey,
            strategyID: orderIdTPData?.strategyID,
            symbol,
            side: positionData.Side,
            orderId: orderIdTPData?.orderID,
            botID,
            botName
        })
    }))

    missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)

    missTPDataBySymbol[botSymbolMissID].orderIDOfListTP = []

    missTPDataBySymbol[botSymbolMissID].orderIDOfListTP.push({
        orderID: positionData.id,
    })
})

socketRealtime.on('disconnect', () => {
    console.log('[V] Disconnected from socket realtime');
});

