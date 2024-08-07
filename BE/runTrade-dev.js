const { exec } = require('child_process');
require('dotenv').config();
const cron = require('node-cron');
const changeColorConsole = require('cli-color');
const TelegramBot = require('node-telegram-bot-api');

const { RestClientV5, WebsocketClient } = require('bybit-api');
const { getAllStrategiesActive, getAllSymbolBE, getFutureBE } = require('./controllers/dataCoinByBit');
const { createPositionBE, updatePositionBE, deletePositionBE, getPositionBySymbol } = require('./controllers/position');

const wsConfig = {
    market: 'v5',
    recvWindow: 60000,
}

const wsSymbol = new WebsocketClient(wsConfig);

const LIST_ORDER = ["order", "position"]
const MAX_ORDER_LIMIT = 10

const clientDigit = new RestClientV5({
    testnet: false,
    recv_window: 60000,
    syncTimeBeforePrivateRequests: true
});

// ----------------------------------------------------------------------------------
let missTPDataBySymbol = {}

var listKline = []
var allSymbol = []


// ------- BTC ------------

var nangOCValue = 0
var checkOrderOCAll = true

var checkBTC07Price = ""
var haOCFunc = ""

// -------  ------------

var allStrategiesByCandleAndSymbol = {}
var listPricePreOne = {}
var trichMauOCListObject = {}
var trichMauTPListObject = {}

var allStrategiesByBotIDAndOrderID = {}
var allStrategiesByBotIDAndStrategiesID = {}
var allStrategiesByBotIDOrderOC = {}
var botApiList = {}
var digitAllCoinObject = {}
var botAmountListObject = {}
var botListTelegram = {}

// ----------------------------------------------------------------------------------

async function Digit() {// proScale
    let PScale = []
    await clientDigit.getInstrumentsInfo({
        category: 'linear',
    })
        .then((response) => {
            PScale = PScale.concat(response.result.list.map(item => ({
                symbol: item.symbol,
                priceScale: item.priceScale
            })))
        })
        .catch((error) => {
            console.log("Error Digit:", error)
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
        syncTimeBeforePrivateRequests: true

    });

    await client
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
                console.log(changeColorConsole.blackBright(`[_OC orderID_] ( ${botName} - ${side} - ${symbol} - ${candle} ):`, newOrderID));

                // sendMessageWithRetry({
                //     messageText: text,
                //     telegramID,
                //     telegramToken
                // })
                !allStrategiesByBotIDOrderOC[botID] && (
                    allStrategiesByBotIDOrderOC[botID] = {
                        totalOC: 0,
                        logError: false
                    }
                )
                allStrategiesByBotIDOrderOC[botID].totalOC += 1
            }
            else {
                console.log(changeColorConsole.yellowBright(`\n[!] Ordered OC ( ${botName} - ${side} - ${symbol} - ${candle} ) failed: `, response.retMsg))
            }

        })
        .catch((error) => {
            console.log(`\n[!] Ordered OC ( ${botName} - ${side} - ${symbol} - ${candle} ) error `, error)
        });
}

const handleSubmitOrderTP = async ({
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

    // console.log(changeColorConsole.greenBright(`Price order TP ( ${botName} - ${side} - ${symbol} - ${candle} ):`, price));

    const botSymbolMissID = `${botID}-${symbol}`

    const client = new RestClientV5({
        testnet: false,
        key: ApiKey,
        secret: SecretKey,
        recv_window: 60000,
        syncTimeBeforePrivateRequests: true

    });
    await client
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
                console.log(changeColorConsole.blackBright(`[_TP orderID_] ( ${botName} - ${side} - ${symbol} - ${candle} ):`, newOrderID));

            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Order TP ${missState ? "( MISS )" : ''} - ( ${botName} - ${side} - ${symbol} - ${candle} ) failed `, response.retMsg))
                if (missState) {
                    console.log(changeColorConsole.yellowBright(`[X] Không thể xử lý MISS ( ${botName} - ${side} - ${symbol} - ${candle} )`))
                    updatePositionBE({
                        newDataUpdate: {
                            Miss: true,
                            TimeUpdated: new Date()
                        },
                        orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                    }).then(message => {
                        console.log(message);
                    }).catch(err => {
                        console.log("ERROR Position TP:", err)
                    })
                }
            }
        })
        .catch((error) => {
            console.log(`[!] Order TP ${missState ? "( MISS )" : ''} - ( ${botName} - ${side} - ${symbol} - ${candle} ) error `, error)
            if (missState) {
                console.log(changeColorConsole.redBright(`[X] Không thể xử lý MISS ( ${botName} - ${side} - ${symbol} - ${candle} )`))
                updatePositionBE({
                    newDataUpdate: {
                        Miss: true,
                        TimeUpdated: new Date()
                    },
                    orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                }).then(message => {
                    console.log(message);
                }).catch(err => {
                    console.log("ERROR Position TP:", err)
                })
            }
            console.log("ERROR Order TP:", error)
        });
}

const moveOrderTP = async ({
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
        syncTimeBeforePrivateRequests: true

    });
    await client
        .amendOrder({
            category: 'linear',
            symbol,
            price,
            orderId
        })
        .then((response) => {
            if (response.retCode == 0) {
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = response.result.orderId
                console.log(`[->] Move Order TP ( ${botName} - ${side} - ${symbol} - ${candle} ) successful`)
            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Move Order TP ( ${botName} - ${side} - ${symbol} - ${candle} ) failed `, response.retMsg))
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = ""
            }
        })
        .catch((error) => {
            console.log(`[!] Move Order TP ( ${botName} - ${side} - ${symbol} - ${candle} ) error `, error)
            allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = ""
        });

}

const handleMoveOrderTP = async ({
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
        await moveOrderTP(dataInput)

    }
}

const handleCancelOrderOC = async ({
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
        syncTimeBeforePrivateRequests: true

    });

    allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderID &&
        !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled &&
        await client
            .cancelOrder({
                category: 'linear',
                symbol,
                orderId
            })
            .then((response) => {
                if (response.retCode == 0) {
                    console.log(`[V] Cancel order ( ${botName} - ${side} -  ${symbol} - ${candle} ) successful `);
                    cancelAll({ strategyID, botID })

                    allStrategiesByBotIDOrderOC[botID].totalOC -= 1
                }
                else {
                    console.log(changeColorConsole.yellowBright(`[!] Cancel order ( ${botName} - ${side} -  ${symbol} - ${candle} ) failed `, response.retMsg))
                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID = ""
                }
            })
            .catch((error) => {
                console.log(`[!] Cancel order ( ${botName} - ${side} -  ${symbol} - ${candle} ) error `, error)
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID = ""
            });

}

const handleCancelOrderTP = async ({
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
        syncTimeBeforePrivateRequests: true

    });
    await client
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
                    }).catch(err => {
                        console.log(err)
                    })
                    resetMissData({
                        botID,
                        symbol
                    })
                }
            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Cancel TP ( ${botName} - ${side} - ${symbol} - ${candle} ) failed `, response.retMsg))
            }
            cancelAll({ strategyID, botID })
        })
        .catch((error) => {
            console.log(`[!] Cancel TP ( ${botName} - ${side} - ${symbol} - ${candle} ) error `, error)
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
            priceOrder: 0,
            orderFilledButMiss: false,
            moveAfterCompare: false,
            newOC: 0
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
            moveSuccess: false,
            orderFilledButMiss: false,
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
                request: {
                    agentOptions: {
                        family: 4
                    }
                }
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
                    throw new Error(error);
                }
            }
        }

        throw new Error('[!] Failed to send message after multiple retries');
    } catch (error) {
        console.log("[!] Bot Telegram Error", error)
    }
};

const getMoneyFuture = async (botApiListInput) => {

    const list = Object.values(botApiListInput)
    if (list.length > 0) {
        const resultGetFuture = await Promise.all(list.map(async botData => getFutureBE(botData.id)))

        if (resultGetFuture.length > 0) {
            resultGetFuture.forEach(data => {
                botAmountListObject[data.botID] = +data.totalWalletBalance || 0
            })
        }
    }
}

const sendAllBotTelegram = async () => {
    const text = "<b>❗ Bão BTC ❗</b>"
    console.log(text);
    await Promise.allSettled(Object.values(botApiList).map(botApiData => {

        const telegramID = botApiData.telegramID
        const telegramToken = botApiData.telegramToken
        sendMessageWithRetry({
            messageText: text,
            telegramID,
            telegramToken
        })
    }))
}

const handleSocketBotApiList = async (botApiListInput = {}) => {

    try {
        const objectToArray = Object.values(botApiListInput);
        const objectToArrayLength = objectToArray.length;
        console.log(changeColorConsole.greenBright("[New-Bot-API] Length:", objectToArrayLength));

        if (objectToArrayLength > 0) {

            await getMoneyFuture(botApiListInput)

            console.log("[...] Subscribe new-bot-list-api successful\n");

            await Promise.allSettled(objectToArray.map(botApiData => {

                const ApiKey = botApiData.ApiKey
                const SecretKey = botApiData.SecretKey
                const botID = botApiData.id


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


                wsOrder.subscribeV5(LIST_ORDER, 'linear').then(() => {
                    wsOrder.on('update', async (dataCoin) => {

                        await delay(200)

                        const botID = botApiData.id

                        const ApiKey = botApiList[botID].ApiKey
                        const SecretKey = botApiList[botID].SecretKey
                        const botName = botApiList[botID].botName

                        const telegramID = botApiList[botID].telegramID
                        const telegramToken = botApiList[botID].telegramToken

                        const dataMain = dataCoin.data[0]
                        const symbol = dataMain.symbol
                        const orderID = dataMain.orderId
                        const orderStatus = dataMain.orderStatus

                        const botSymbolMissID = `${botID}-${symbol}`

                        if (orderStatus === "Filled") {
                            console.log(changeColorConsole.greenBright(`[V] Filled OrderID ( ${botName} - ${dataMain.side} - ${symbol} ):`, orderID));

                        }


                        if (ApiKey && SecretKey) {


                            if (dataCoin.topic === "order") {


                                const strategyData = allStrategiesByBotIDAndOrderID[botID]?.[orderID]

                                const strategy = strategyData?.strategy
                                const OCTrue = strategyData?.OC
                                const TPTrue = strategyData?.TP

                                if (strategy) {

                                    const strategyID = strategy.value


                                    if (orderStatus === "Filled") {

                                        if (OCTrue) {

                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderFilled = true

                                            // Send telegram
                                            const openTrade = +dataMain.avgPrice  //Gia khop lenh

                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.openTrade = openTrade

                                            const sideText = strategy.PositionSide === "Long" ? "Buy" : "Sell"


                                            const qty = dataMain.qty

                                            const newOC = (Math.abs((openTrade - strategy.coinOpen)) / strategy.coinOpen * 100).toFixed(2)

                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.newOC = newOC
                                            // const newOC = strategy.OrderChange

                                            const priceOldOrder = (botAmountListObject[botID] * strategy.Amount / 100).toFixed(2)

                                            console.log(`\n[V] Filled OC: \n${symbol.replace("USDT", "")} | Open ${strategy.PositionSide} \nBot: ${botName} \nFT: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% -> ${newOC}% | TP: ${strategy.TakeProfit}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}\n`);
                                            const teleText = `<b>${symbol.replace("USDT", "")}</b> | Open ${strategy.PositionSide} \nBot: ${botName} \nFT: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% -> ${newOC}% | TP: ${strategy.TakeProfit}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}`
                                            // const teleText = `<b>${symbol.replace("USDT", "")}</b> | Open ${sideText} \nBot: ${botName} \nFT: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% | TP: ${strategy.TakeProfit}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}`

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
                                                    console.log(data.message);
                                                    !missTPDataBySymbol[botSymbolMissID] && resetMissData({ botID, symbol })

                                                    const newID = data.id
                                                    if (newID) {
                                                        missTPDataBySymbol[botSymbolMissID].orderIDToDB = newID
                                                    }
                                                    else {
                                                        await getPositionBySymbol({ symbol, botID }).then(data => {
                                                            console.log(data.message);
                                                            missTPDataBySymbol[botSymbolMissID].orderIDToDB = data.id
                                                        }).catch(error => {
                                                            console.log("ERROR getPositionBySymbol:", error)

                                                        })
                                                    }

                                                }).catch(err => {
                                                    console.log("ERROR createPositionBE:", err)
                                                })
                                            }

                                            // Create TP

                                            let TPNew = 0

                                            if (strategy.PositionSide === "Long") {
                                                TPNew = openTrade + Math.abs((openTrade - strategy.coinOpen)) * (strategy.TakeProfit / 100)
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare = openTrade + Math.abs((openTrade - strategy.coinOpen)) * ((strategy.EntryTrailing || 40) / 100)
                                            }
                                            else {
                                                TPNew = openTrade - Math.abs((openTrade - strategy.coinOpen)) * (strategy.TakeProfit / 100)
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare = openTrade - Math.abs((openTrade - strategy.coinOpen)) * ((strategy.EntryTrailing || 40) / 100)
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

                                            await handleSubmitOrderTP(dataInput)

                                            sendMessageWithRetry({
                                                messageText: teleText,
                                                telegramID,
                                                telegramToken,
                                            })
                                        }
                                        // Khớp TP
                                        else if (TPTrue) {

                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderFilled = true

                                            const closePrice = +dataMain.avgPrice

                                            const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"

                                            const openTradeOCFilled = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.OC.openTrade

                                            const qty = +dataMain.qty
                                            const priceOldOrder = (botAmountListObject[botID] * strategy.Amount / 100).toFixed(2)

                                            const newOC = allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.newOC

                                            console.log(`\n[V] Filled TP: \n${symbol.replace("USDT", "")} | Close ${strategy.PositionSide} \nBot: ${botName} \nFT: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% -> ${newOC}% | TP: ${strategy.TakeProfit}% \nPrice: ${closePrice} | Amount: ${priceOldOrder}\n`);
                                            const teleText = `<b>${symbol.replace("USDT", "")}</b> | Close ${strategy.PositionSide} \nBot: ${botName} \nFT: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% -> ${newOC}% | TP: ${strategy.TakeProfit}% \nPrice: ${closePrice} | Amount: ${priceOldOrder}`
                                            // const teleText = `<b>${symbol.replace("USDT", "")}</b> | Close ${side} \nBot: ${botName} \nFT: ${strategy.Candlestick} | OC: ${strategy.OrderChange}% | TP: ${strategy.TakeProfit}% \nPrice: ${closePrice} | Amount: ${priceOldOrder}`

                                            const priceWinPercent = (Math.abs(closePrice - openTradeOCFilled) / openTradeOCFilled * 100).toFixed(2) || 0;
                                            const priceWin = ((closePrice - openTradeOCFilled) * qty).toFixed(2) || 0;

                                            let textWinLose = ""

                                            if (side === "Buy") {
                                                if (priceWin > 0) {
                                                    textWinLose = `\n✅ [WIN - LONG]: ${priceWin} | ${priceWinPercent}%\n`
                                                    console.log(changeColorConsole.greenBright(textWinLose));
                                                }
                                                else {
                                                    textWinLose = `\n❌ [LOSE - LONG]: ${priceWin} | ${priceWinPercent}%\n`
                                                    console.log(changeColorConsole.magentaBright(textWinLose));
                                                }
                                            }
                                            else {
                                                if (priceWin > 0) {
                                                    textWinLose = `\n❌ [LOSE - SHORT]: ${-1 * priceWin} | ${priceWinPercent}%\n`
                                                    console.log(changeColorConsole.magentaBright(textWinLose));
                                                }
                                                else {
                                                    textWinLose = `\n✅ [WIN - SHORT]: ${Math.abs(priceWin)} | ${priceWinPercent}%\n`
                                                    console.log(changeColorConsole.greenBright(textWinLose));
                                                }
                                            }

                                            missTPDataBySymbol[botSymbolMissID].size -= Math.abs(qty)

                                            // Fill toàn bộ
                                            if (missTPDataBySymbol[botSymbolMissID]?.sizeTotal == qty || missTPDataBySymbol[botSymbolMissID]?.size == 0) {
                                                // 
                                                console.log(`\n[_FULL Filled_] Filled TP ( ${botName} - ${side} - ${symbol} - ${strategy.Candlestick} )\n`);

                                                missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)

                                                if (missTPDataBySymbol[botSymbolMissID]?.orderIDToDB) {
                                                    deletePositionBE({
                                                        orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                                    }).then(message => {
                                                        console.log(`[...] Delete Position ( ${botName} - ${side} - ${symbol} - ${strategy.Candlestick} )`);
                                                        console.log(message);
                                                    }).catch(err => {
                                                        console.log("ERROR deletePositionBE:", err)
                                                    })
                                                }

                                                console.log(`[...] Reset All ( ${botName} - ${side} - ${symbol} - ${strategy.Candlestick} )`);

                                                resetMissData({
                                                    botID,
                                                    symbol,
                                                })

                                                allStrategiesByBotIDOrderOC[botID].totalOC -= 1
                                            }
                                            else {
                                                console.log(`\n[_Part Filled_] Filled TP ( ${botName} - ${side} - ${symbol} - ${strategy.Candlestick} )\n`);
                                            }


                                            sendMessageWithRetry({
                                                messageText: `${teleText} \n${textWinLose}`,
                                                telegramID,
                                                telegramToken,
                                            })

                                            cancelAll({ strategyID, botID })

                                        }
                                    }

                                    else if (orderStatus === "Cancelled") {
                                        // console.log("[X] Cancelled");
                                        // Khớp TP
                                        if (TPTrue) {
                                            console.log(`[-] Cancelled TP ( ${strategy.PositionSide === "Long" ? "Sell" : "Buy"} - ${symbol} - ${strategy.Candlestick} ) - Chốt lời `);
                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = ""
                                            const qty = +dataMain.qty
                                            missTPDataBySymbol[botSymbolMissID].size -= Math.abs(qty)

                                            if (missTPDataBySymbol[botSymbolMissID]?.sizeTotal - missTPDataBySymbol[botSymbolMissID].size > 0) {
                                                missTPDataBySymbol[botSymbolMissID].gongLai = true
                                                updatePositionBE({
                                                    newDataUpdate: {
                                                        Miss: true,
                                                        TimeUpdated: new Date()
                                                    },
                                                    orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                                }).then(message => {
                                                    console.log(message);
                                                }).catch(err => {
                                                    console.log("ERROR updatePositionBE:", err)
                                                })
                                                resetMissData({
                                                    botID,
                                                    symbol,
                                                })
                                            }

                                        }
                                        else if (OCTrue) {
                                            console.log(`[-] Cancelled OC ( ${strategy.PositionSide === "Long" ? "Sell" : "Buy"} - ${symbol} - ${strategy.Candlestick}) `);
                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID = ""

                                            allStrategiesByBotIDOrderOC[botID].totalOC -= 1
                                        }

                                    }
                                }
                            }
                            // User cancel vị thế
                            if (dataMain.orderType === "Market") {
                                const side = dataMain.side
                                console.log(`[...] User ( ${botName} ) Clicked Close Vị Thế`)

                                const listMiss = missTPDataBySymbol[botSymbolMissID]?.orderIDOfListTP
                                console.log("listMiss?.length", listMiss?.length);

                                listMiss?.length > 0 &&
                                    await Promise.allSettled(listMiss.map(async orderIdTPData => {
                                        handleCancelOrderTP({
                                            ApiKey,
                                            SecretKey,
                                            strategyID: orderIdTPData?.strategyID,
                                            symbol,
                                            side,
                                            orderId: orderIdTPData?.orderID,
                                            botID,
                                            botName
                                        })
                                        allStrategiesByBotIDOrderOC[botID].totalOC -= 1
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
                                    deletePositionBE({
                                        orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                    }).then(message => {
                                        console.log(message);
                                    }).catch(err => {
                                        console.log("ERROR deletePositionBE:", err)
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
                                                        console.log("ERROR getPositionBySymbol:", error)
                                                    })
                                                }

                                            }).catch(err => {
                                                console.log("ERROR createPositionBE:", err)
                                            })
                                        }

                                        if (!missTPDataBySymbol[botSymbolMissID]?.gongLai) {
                                            if (missSize > 0) {

                                                if (!missTPDataBySymbol[botSymbolMissID]?.orderID) {

                                                    const teleText = `<b>⚠️ [ MISS ] | ${symbol.replace("USDT", "")}</b> - ${side} - Bot: ${botName} - PnL: ${dataMain.unrealisedPnl} \n`
                                                    console.log(changeColorConsole.redBright(`\n${teleText}\n`));

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
                                                        console.log("ERROR updatePositionBE:", err)
                                                    })
                                                    sendMessageWithRetry({
                                                        messageText: teleText,
                                                        telegramID,
                                                        telegramToken
                                                    })
                                                }
                                            }
                                            else {
                                                console.log(`[_ Not Miss _] TP ( ${botName} - ${side} - ${symbol}} )`);
                                                updatePositionBE({
                                                    newDataUpdate: {
                                                        Miss: false,
                                                        TimeUpdated: new Date()
                                                    },
                                                    orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                                }).then(message => {
                                                    console.log(message);
                                                }).catch(err => {
                                                    console.log("ERROR updatePositionBE:", err)
                                                })
                                            }
                                        }
                                        else {
                                            const teleText = `<b>⚠️ [ MISS ] | ${symbol.replace("USDT", "")}</b> - ${side} - Bot: ${botName} - PnL: ${dataMain.unrealisedPnl} \n`
                                            console.log(changeColorConsole.redBright(`\n${teleText}\n`));
                                            updatePositionBE({
                                                newDataUpdate: {
                                                    Miss: true,
                                                    TimeUpdated: new Date()
                                                },
                                                orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                            }).then(message => {
                                                console.log(message);
                                            }).catch(err => {
                                                console.log("ERROR updatePositionBE:", err)
                                            })
                                        }

                                    }, 2500)
                                }
                                else {
                                    missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)
                                }
                            }
                        }
                        else {
                            console.log(changeColorConsole.redBright(`[!] Lỗi ApiKey ( ${botName} )`));
                        }

                    })

                    wsOrder.on('close', () => {
                        console.log('Connection order closed');
                        wsOrder.connectPrivate(LIST_ORDER, "linear")
                    });

                    wsOrder.on('reconnected', () => {
                        console.log('Reconnected order successful')
                    });

                    wsOrder.on('error', (err) => {
                        console.log('Connection order error');
                        console.log(err);
                    });
                }).catch(err => {
                    console.log(`[V] Subscribe order ${botID} error:`, err)
                })



            }))
        }
    } catch (error) {
        console.log("[!] Error BotApi Socket:", e)
    }
}

const handleSocketListKline = async (listKlineInput) => {

    wsSymbol.subscribeV5(listKlineInput, 'linear').then(() => {

        console.log("[V] Subscribe kline successful\n");

        wsSymbol.on('update', async (dataCoin) => {

            const topic = dataCoin.topic
            const topicSplit = topic.split(".")
            const candle = topicSplit[1]
            const symbol = topicSplit[2]

            const dataMain = dataCoin.data[0]
            const coinOpen = +dataMain.open
            const coinCurrent = +dataMain.close

            if (symbol === "BTCUSDT" && candle == 1) {
                const BTCPricePercent = Math.abs((+dataMain.close - +dataMain.open)) / (+dataMain.open) * 100

                if (BTCPricePercent >= 0.7) {
                    const newCheckBTC07Price = Math.round(BTCPricePercent)
                    if (newCheckBTC07Price !== checkBTC07Price) {
                        checkBTC07Price = newCheckBTC07Price
                        sendAllBotTelegram()
                    }
                    if (BTCPricePercent >= 1) {
                        const newNangOCValue = Math.ceil(BTCPricePercent) * 5

                        if (newNangOCValue !== nangOCValue) {
                            nangOCValue = newNangOCValue
                            checkOrderOCAll = false
                        }
                    }
                }
                else {
                    checkOrderOCAll = true
                }

            }

            const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]?.[candle]

            if (checkOrderOCAll) {

                coinCurrent && coinOpen && listDataObject && Object.values(listDataObject)?.length > 0 && Promise.allSettled(Object.values(listDataObject).map(async strategy => {

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

                        if (dataMain.confirm == false && strategy.IsActive) {
                            if (!allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderID) {

                                !allStrategiesByBotIDOrderOC[botID] && (
                                    allStrategiesByBotIDOrderOC[botID] = {
                                        totalOC: 0,
                                        logError: false
                                    }
                                )

                                allStrategiesByBotIDOrderOC[botID]?.totalOC < 0 && (allStrategiesByBotIDOrderOC[botID].totalOC = 0)


                                if (allStrategiesByBotIDOrderOC[botID]?.totalOC < MAX_ORDER_LIMIT) {

                                    allStrategiesByBotIDOrderOC[botID].logError = false

                                    // trichMauOCListObject[symbolCandleID].curTime = new Date()

                                    // if (trichMauOCListObject[symbolCandleID].curTime - trichMauOCListObject[symbolCandleID].preTime > 100) {

                                    // trichMauOCListObject[symbolCandleID].preTime = new Date()

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
                                    // }

                                    // if (trichMauOCListObject[symbolCandleID].coinColor.length === 3) {

                                    if (trichMauOCListObject[symbolCandleID].minPrice.length === 3 && trichMauOCListObject[symbolCandleID].coinColor.length === 3) {
                                        let conditionOrder = 0
                                        let priceOrder = 0

                                        // Check pre coin type 

                                        let coinPreCoin = ""
                                        let conditionPre = false

                                        const pricePreData = listPricePreOne[symbolCandleID]
                                        if (pricePreData.close) {
                                            if (pricePreData.close > pricePreData.open) {
                                                coinPreCoin = "Blue"
                                            }
                                            else {
                                                coinPreCoin = "Red"
                                            }
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

                                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.priceOrder = +priceOrder

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
                                            +conditionOrder >= coinCurrent && (coinOpen - coinCurrent) > 0 && conditionPre && await handleSubmitOrder(dataInput)
                                        }
                                        else {
                                            +conditionOrder <= coinCurrent && (coinOpen - coinCurrent) < 0 && conditionPre && await handleSubmitOrder(dataInput)
                                        }
                                    }
                                }

                                else {
                                    if (allStrategiesByBotIDOrderOC[botID]?.totalOC && !allStrategiesByBotIDOrderOC[botID]?.logError) {
                                        console.log(changeColorConsole.redBright(`[!] LIMIT ORDER OC ( ${botName} )`));
                                        allStrategiesByBotIDOrderOC[botID].logError = true
                                    }
                                }
                            }

                            // Xem xét dịch OC
                            if (
                                allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderID &&
                                !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled &&
                                !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilledButMiss &&
                                !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.moveAfterCompare
                            ) {
                                const textQuanSat = `🙄 Xem xét OC ( ${botName} - ${side} - ${symbol} - ${candle} )`
                                // console.log(changeColorConsole.cyanBright(textQuanSat));

                                let checkMoveMain = false
                                const percentt = 4 / 100
                                const priceOrderOC = allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.priceOrder

                                if (side === "Buy") {
                                    if (coinCurrent <= (priceOrderOC + Math.abs(priceOrderOC - coinOpen) * percentt)) {
                                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.moveAfterCompare = true
                                        checkMoveMain = true
                                    }
                                }
                                else {
                                    if (coinCurrent >= (priceOrderOC - Math.abs(priceOrderOC - coinOpen) * percentt)) {

                                        allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.moveAfterCompare = true
                                        checkMoveMain = true
                                    }
                                }
                                if (checkMoveMain && !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled) {
                                    const client = new RestClientV5({
                                        testnet: false,
                                        key: ApiKey,
                                        secret: SecretKey,
                                        recv_window: 60000,
                                        syncTimeBeforePrivateRequests: true

                                    });
                                    const newOCTemp = Math.abs((coinCurrent - coinOpen)) / coinOpen * 100

                                    client
                                        .amendOrder({
                                            category: 'linear',
                                            symbol,
                                            price: coinCurrent.toFixed(strategy.digit),
                                            orderId: allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID
                                        })
                                        .then(async (response) => {
                                            if (response.retCode == 0) {
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID = response.result.orderId
                                                console.log(changeColorConsole.blueBright(`[->] Move Order OC Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) successful:`, coinCurrent.toFixed(strategy.digit)))
                                                console.log(changeColorConsole.blackBright(`[_OC orderID Move_] ( ${botName} - ${side} - ${symbol} - ${candle} ) :`, response.result.orderId));

                                                const textQuayDau = `😃 Dịch OC ( ${strategy.OrderChange}% -> ${newOCTemp.toFixed(2)}% ) ( ${botName} - ${side} - ${symbol} - ${candle} ) `
                                                console.log(changeColorConsole.yellowBright(textQuayDau));
                                                // sendMessageWithRetry({
                                                //     messageText: textQuayDau,
                                                //     telegramID,
                                                //     telegramToken
                                                // })
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.moveAfterCompare = false
                                            }
                                            else {
                                                console.log(changeColorConsole.yellowBright(`[!] Move Order OC Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) failed `, response.retMsg))
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderFilledButMiss = true
                                            }
                                        })
                                        .catch((error) => {
                                            console.log(`[!] Move Order OC Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) error `, error)
                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderFilledButMiss = true
                                        });


                                }
                            }

                            // if have TP
                            if (
                                allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID &&
                                !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.orderFilled &&
                                !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.moveAfterCompare &&
                                !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.orderFilledButMiss
                            ) {
                                let checkMoveMain = false || allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveSuccess

                                if (!checkMoveMain) {
                                    const PercentCheck = 2 / 100
                                    const sideCheck = allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.side

                                    const openTrade = allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.coinClose || allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.openTrade

                                    !allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice && (allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice = coinCurrent)

                                    // console.log(changeColorConsole.cyanBright(`priceCompare ( ${botName} - ${side} - ${symbol} - ${candle} ) `, allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare));
                                    let textQuanSat = ``
                                    if (sideCheck === "Buy") {
                                        if ((coinCurrent < allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.priceCompare)) {
                                            textQuanSat = `🙈 Vào khoảng theo dõi ( ${botName} - ${side} - ${symbol} - ${candle} ) `
                                            console.log(changeColorConsole.cyanBright(textQuanSat));
                                            // sendMessageWithRetry({
                                            //     messageText: textQuanSat,
                                            //     telegramID,
                                            //     telegramToken
                                            // })
                                            if (coinCurrent > allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice + Math.abs(openTrade - allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice) * PercentCheck) {

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
                                            // sendMessageWithRetry({
                                            //     messageText: textQuanSat,
                                            //     telegramID,
                                            //     telegramToken
                                            // })
                                            if (coinCurrent < allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice - Math.abs(openTrade - allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice) * PercentCheck) {

                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveAfterCompare = true
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveSuccess = true
                                                checkMoveMain = true
                                            }
                                        }
                                    }
                                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.minMaxTempPrice = coinCurrent

                                }
                                if (checkMoveMain && !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.orderFilled) {

                                    // console.log(changeColorConsole.cyanBright(`Price Move TP Compare ( ${botName} - ${side} - ${symbol} - ${candle} ):`, coinCurrent));
                                    const client = new RestClientV5({
                                        testnet: false,
                                        key: ApiKey,
                                        secret: SecretKey,
                                        recv_window: 60000,
                                        syncTimeBeforePrivateRequests: true

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
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = response.result.orderId
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.price = coinCurrent
                                                console.log(changeColorConsole.blueBright(`[->] Move Order TP Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) successful:`, coinCurrent.toFixed(strategy.digit)))
                                                const textQuayDau = `\n😎 Quay đầu ( ${botName} - ${side} - ${symbol} - ${candle} )\n`
                                                console.log(changeColorConsole.greenBright(textQuayDau));
                                                // sendMessageWithRetry({
                                                //     messageText: textQuayDau,
                                                //     telegramID,
                                                //     telegramToken
                                                // })
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.moveAfterCompare = false
                                            }
                                            else {
                                                console.log(changeColorConsole.yellowBright(`[!] Move Order TP Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) failed `, response.retMsg))
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderFilledButMiss = true
                                            }
                                        })
                                        .catch((error) => {
                                            console.log(`[!] Move Order TP Compare ( ${botName} - ${side} - ${symbol} - ${candle} ) error `, error)
                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderFilledButMiss = true
                                        });


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


                                !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID].TP.moveSuccess && await handleMoveOrderTP({
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

                            await handleCancelOrderOC(
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

                            trichMauOCListObject[symbolCandleID] = {
                                maxPrice: 0,
                                minPrice: [],
                                prePrice: 0,
                                coinColor: [],
                                curTime: 0,
                                preTime: 0,
                            }

                        }
                    }

                }))
            }
            else {
                console.log(changeColorConsole.greenBright("[...] START NÂNG OC"));

                await Promise.allSettled(
                    allSymbol.map(async symbolItem => {
                        const symbol = symbolItem.value
                        return Promise.allSettled([1, 3, 5, 15].map(candle => {
                            const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]?.[candle]
                            if (listDataObject && Object.values(listDataObject)?.length > 0) {
                                return Promise.allSettled(Object.values(listDataObject).map(async strategy => {
                                    const strategyID = strategy.value

                                    const botID = strategy.botID._id
                                    const botName = strategy.botID.botName
                                    const ApiKey = strategy.botID.ApiKey
                                    const SecretKey = strategy.botID.SecretKey


                                    allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChangeOld = allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChange
                                    allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChange = allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChangeOld + nangOCValue

                                    // console.log(allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChangeOld);
                                    // console.log("nangOC", nangOCValue);
                                    // console.log("strategy.OrderChange", strategy.OrderChange);

                                    handleCancelOrderOC(
                                        {
                                            strategyID,
                                            symbol,
                                            ApiKey,
                                            SecretKey,
                                            botName,
                                            botID
                                        }
                                    )
                                }))
                            }
                        }))
                    }
                    ))
                console.log(changeColorConsole.greenBright("[V] NÂNG OC XONG"));
                checkOrderOCAll = true
                haOCFunc && clearTimeout(haOCFunc)
                haOCFunc = setTimeout(async () => {
                    await Promise.allSettled(
                        allSymbol.map(async symbolItem => {
                            const symbol = symbolItem.value
                            return Promise.allSettled([1, 3, 5, 15].map(candle => {
                                const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]?.[candle]
                                if (listDataObject && Object.values(listDataObject)?.length > 0) {
                                    return Promise.allSettled(Object.values(listDataObject).map(async strategy => {
                                        const strategyID = strategy.value

                                        allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChange = allStrategiesByCandleAndSymbol[symbol][candle][strategyID].OrderChangeOld

                                    }))
                                }
                            }))
                        }
                        ))
                    console.log(changeColorConsole.greenBright("[V] HẠ OC XONG"));

                }, 5 * 60000)
            }

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
            wsSymbol.unsubscribeV5(listKline, "linear")
        });

        wsSymbol.on('reconnected', () => {
            console.log('[V] Reconnected listKline successful')
        });

        wsSymbol.on('error', (err) => {
            console.log('[!] Connection listKline error');
            console.log(err);
        });
    }).catch(err => {
        console.log("[!] Subscribe kline error:", err)
    })

}


// ----------------------------------------------------------------------------------
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const checkConditionBot = (botData) => {
    return botData.botID?.Status === "Running" && botData.botID?.ApiKey && botData.botID?.SecretKey
}

// ----------------------------------------------------------------------------------


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


            botApiList[botID] = {
                id: botID,
                botName,
                ApiKey: strategyItem.botID.ApiKey,
                SecretKey: strategyItem.botID.SecretKey,
                telegramID: strategyItem.botID.telegramID,
                telegramToken: strategyItem.botID.telegramToken,
            }

            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {})
            !allStrategiesByCandleAndSymbol[symbol][Candlestick] && (allStrategiesByCandleAndSymbol[symbol][Candlestick] = {})
            allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID] = strategyItem

            cancelAll({ strategyID, botID })

            allStrategiesByBotIDOrderOC[botID] = {
                totalOC: 0,
                logError: false
            }


        }
    })

    const resultDigitAll = await Digit()
    resultDigitAll?.length > 0 && (
        resultDigitAll.reduce((pre, cur) => {
            if (cur.symbol.includes("USDT")) {
                pre[cur.symbol] = cur.priceScale
            }
            return pre
        }, digitAllCoinObject)
    )

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
                coinColor: [],
                curTime: 0,
                preTime: 0,
            }
            trichMauTPListObject[symbolCandleID] = {
                maxPrice: 0,
                minPrice: [],
                prePrice: 0,
            }
        })
    })

    await handleSocketBotApiList(botApiList)

    await handleSocketListKline(listKline)

}

try {
    Main()

    setTimeout(() => {
        cron.schedule(`*/3 * * * * *`, () => {
            getMoneyFuture(botApiList)
        });
    }, 100000)


}

catch (e) {
    console.log("Error Main:", e)
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

    await Promise.allSettled(newData.map(async newStrategiesData => {

        if (checkConditionBot(newStrategiesData)) {

            delete newStrategiesData.TimeTemp

            const symbol = newStrategiesData.symbol

            const strategyID = newStrategiesData.value

            const botID = newStrategiesData.botID._id
            const botName = newStrategiesData.botID.botName
            const Candlestick = newStrategiesData.Candlestick.split("")[0]

            const ApiKey = newStrategiesData.botID.ApiKey
            const SecretKey = newStrategiesData.botID.SecretKey


            if (!botApiList[botID]) {
                newBotApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID: newStrategiesData.botID.telegramID,
                    telegramToken: newStrategiesData.botID.telegramToken,
                }
                allStrategiesByBotIDOrderOC[botID] = {
                    totalOC: 0,
                    logError: false
                }
            }

            botApiList[botID] = {
                id: botID,
                botName,
                ApiKey,
                SecretKey,
                telegramID: newStrategiesData.botID.telegramID,
                telegramToken: newStrategiesData.botID.telegramToken,
            }

            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {})
            !allStrategiesByCandleAndSymbol[symbol][Candlestick] && (allStrategiesByCandleAndSymbol[symbol][Candlestick] = {})
            allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID] = newStrategiesData

            cancelAll({ strategyID, botID })

        }

    }))

    handleSocketBotApiList(newBotApiList)

});

socketRealtime.on('update', async (newData = []) => {
    console.log("[...] Update Strategies From Realtime", newData.length);

    const newBotApiList = {}

    await Promise.allSettled(newData.map((strategiesData) => {

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
            allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID].OrderChangeOld = strategiesData.OrderChange


            !allStrategiesByBotIDAndOrderID[botID] && (allStrategiesByBotIDAndOrderID[botID] = {})
            !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID })


            if (IsActive) {
                if (!botApiList[botID]) {

                    newBotApiList[botID] = {
                        id: botID,
                        botName,
                        ApiKey,
                        SecretKey,
                        telegramID: strategiesData.botID.telegramID,
                        telegramToken: strategiesData.botID.telegramToken,
                    }
                    allStrategiesByBotIDOrderOC[botID] = {
                        totalOC: 0,
                        logError: false
                    }
                }
            }

            botApiList[botID] = {
                id: botID,
                botName,
                ApiKey,
                SecretKey,
                telegramID: strategiesData.botID.telegramID,
                telegramToken: strategiesData.botID.telegramToken,
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
            }

        }

    }))

    handleSocketBotApiList(newBotApiList)

});

socketRealtime.on('delete', async (newData) => {
    console.log("[...] Deleted Strategies From Realtime");

    await Promise.allSettled(newData.map((strategiesData, index) => {
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

            }
            delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
            delete allStrategiesByCandleAndSymbol[symbol]?.[Candlestick]?.[strategyID]
        }
    }))

});


socketRealtime.on('bot-update', async (data = {}) => {
    const { newData, botIDMain, botActive } = data;

    const botNameExist = botApiList[botIDMain]?.botName || botIDMain
    console.log(`[...] Bot-Update ( ${botNameExist} ) Strategies From Realtime`, newData.length);

    const newBotApiList = {}

    const botApiData = botApiList[botIDMain]

    // if (botApiData) {

    //     const ApiKeyBot = botApiData.ApiKey
    //     const SecretKeyBot = botApiData.SecretKey

    //     const wsConfigOrder = {
    //         key: ApiKeyBot,
    //         secret: SecretKeyBot,
    //         market: 'v5',
    //         recvWindow: 60000
    //     }

    //     const wsOrder = new WebsocketClient(wsConfigOrder);

    //     if (botActive) {
    //         await wsOrder.subscribeV5(LIST_ORDER, 'linear')
    //     }
    //     else {
    //         console.log(`[V] UnsubscribeV5 ( ${botNameExist} )`);
    //         await wsOrder.unsubscribeV5(LIST_ORDER, 'linear')
    //     }
    // }

    await Promise.allSettled(newData.map((strategiesData, index) => {

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
        const OrderChangeOld = allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID]?.OrderChangeOld
        allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID] = strategiesData
        allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID].OrderChangeOld = OrderChangeOld || allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID].OrderChange

        !allStrategiesByBotIDAndOrderID[botID] && (allStrategiesByBotIDAndOrderID[botID] = {})
        !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID })



        if (IsActive) {
            if (!botApiList[botID]) {

                newBotApiList[botID] = {
                    id: botID,
                    ApiKey,
                    SecretKey,
                    botName,
                    telegramID: strategiesData.botID.telegramID,
                    telegramToken: strategiesData.botID.telegramToken,
                }

                allStrategiesByBotIDOrderOC[botID] = {
                    totalOC: 0,
                    logError: false
                }
            }
        }

        botApiList[botID] = {
            id: botID,
            ApiKey,
            SecretKey,
            botName,
            telegramID: strategiesData.botID.telegramID,
            telegramToken: strategiesData.botID.telegramToken,
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
        }

    }))


    !botApiData && handleSocketBotApiList(newBotApiList)

});

socketRealtime.on('bot-api', async (data) => {
    const { newData, botID: botIDMain, newApiData } = data;

    const botNameExist = botApiList[botIDMain]?.botName || botIDMain

    console.log(`[...] Bot-Api ${botNameExist} Update Strategies From Realtime`, newData.length);

    await Promise.allSettled(newData.map((strategiesData, index) => {

        if (checkConditionBot(strategiesData)) {
            const strategyID = strategiesData.value
            const symbol = strategiesData.symbol
            const ApiKey = strategiesData.botID.ApiKey
            const SecretKey = strategiesData.botID.SecretKey
            const botID = strategiesData.botID._id
            const botName = strategiesData.botID.botName
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
            }
        }
    }))

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
        console.log("[!] Error subscribeV5", error)
    }

});

socketRealtime.on('bot-delete', async (data) => {
    const { newData, botID: botIDMain } = data;

    const botNameExist = botApiList[botIDMain]?.botName || botIDMain

    console.log(`[...] Bot Deleted ( ${botNameExist} ) Strategies From Realtime`);

    await Promise.allSettled(newData.map(async (strategiesData, index) => {
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

            }
            delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
            delete allStrategiesByCandleAndSymbol[symbol]?.[Candlestick]?.[strategyID]
        }
    }))

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

    const { newData, botID: botIDMain, newApiData } = data;

    const botNameExist = botApiList[botIDMain]?.botName || botIDMain

    console.log(`[...] Bot Telegram ( ${botNameExist} ) Update From Realtime`);

    const telegramTokenOld = newApiData.telegramTokenOld
    const telegramID = newApiData.telegramID
    const telegramToken = newApiData.telegramToken

    await Promise.allSettled(newData.map(strategiesData => {

        if (checkConditionBot(strategiesData)) {

            const strategyID = strategiesData.value
            const symbol = strategiesData.symbol
            const Candlestick = strategiesData.Candlestick

            const newStrategiesDataUpdate = {
                ...strategiesData,
                botID:
                {
                    ...strategiesData.botID,
                    telegramID,
                    telegramToken,
                }
            }

            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {})
            !allStrategiesByCandleAndSymbol[symbol][Candlestick] && (allStrategiesByCandleAndSymbol[symbol][Candlestick] = {})
            const OrderChangeOld = allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID]?.OrderChangeOld
            allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID] = newStrategiesDataUpdate
            allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID].OrderChangeOld = OrderChangeOld || allStrategiesByCandleAndSymbol[symbol][Candlestick][strategyID].OrderChange

        }
    }))

    botApiList[botIDMain] = {
        ...botApiList[botIDMain],
        telegramID,
        telegramToken
    }


    // if (botListTelegram[telegramTokenOld]) {
    //     botListTelegram[telegramTokenOld]?.stopPolling()
    //     delete botListTelegram[telegramTokenOld]
    // }
});

socketRealtime.on('sync-symbol', async (newData) => {
    console.log("[...] Sync Symbol");

    allSymbol = allSymbol.concat(newData)

    const newListKline = newData.flatMap(symbolData => ([
        `kline.1.${symbolData.value}`,
        `kline.3.${symbolData.value}`,
        `kline.5.${symbolData.value}`,
        `kline.15.${symbolData.value}`,
    ]))


    const resultDigitAll = await Digit()
    resultDigitAll?.length > 0 && (
        resultDigitAll.reduce((pre, cur) => {
            if (cur.symbol.includes("USDT")) {
                pre[cur.symbol] = cur.priceScale
            }
            return pre
        }, digitAllCoinObject)
    )

    newData.forEach(item => {
        const symbol = item.value
        const listKline = [1, 3, 5, 15]
        listKline.forEach(candle => {
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
                coinColor: [],
                curTime: 0,
                preTime: 0,
            }
            trichMauTPListObject[symbolCandleID] = {
                maxPrice: 0,
                minPrice: [],
                prePrice: 0,
            }

        })

    })

    handleSocketListKline(newListKline)

});

socketRealtime.on("close-limit", async (data) => {
    const { positionData, newOrderID } = data

    const symbol = positionData.Symbol
    const botName = positionData.BotName
    const botID = positionData.botID
    console.log(`[...] Close Limit ( ${botName} - ${symbol} )`);

    const botSymbolMissID = `${botID}-${symbol}`

    const listMiss = missTPDataBySymbol[botSymbolMissID]?.orderIDOfListTP

    listMiss?.length > 0 && await Promise.allSettled(listMiss.map((orderIdTPData) => {
        handleCancelOrderTP({
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
    !missTPDataBySymbol[botSymbolMissID] && resetMissData({ botID, symbol })

    missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)

    missTPDataBySymbol[botSymbolMissID].orderIDOfListTP = []

    missTPDataBySymbol[botSymbolMissID].orderIDOfListTP.push({
        orderID: newOrderID,
    })
    missTPDataBySymbol[botSymbolMissID].size = Math.abs(positionData.Quantity)

})

socketRealtime.on('close-upcode', async () => {

    console.log(`[...] Close All Bot For Upcode`);

    await Promise.allSettled(
        allSymbol.map(async symbolItem => {
            const symbol = symbolItem.value
            return Promise.allSettled([1, 3, 5, 15].map(candle => {
                const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]?.[candle]
                if (listDataObject && Object.values(listDataObject)?.length > 0) {
                    return Promise.allSettled(Object.values(listDataObject).map(async strategy => {
                        const strategyID = strategy.value
                        allStrategiesByCandleAndSymbol[symbol][candle][strategyID] = {
                            ...allStrategiesByCandleAndSymbol[symbol][candle][strategyID],
                            IsActive: false
                        }
                        const botID = strategy.botID._id
                        const botName = strategy.botID.botName
                        const ApiKey = strategy.botID.ApiKey
                        const SecretKey = strategy.botID.SecretKey
                        allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderID && handleCancelOrderOC(
                            {
                                strategyID,
                                symbol,
                                ApiKey,
                                SecretKey,
                                botName,
                                botID
                            }
                        )
                    }))
                }
            }))
        }
        ))

    console.log("PM2 Kill Successful");
    exec("pm2 kill")

});

socketRealtime.on('disconnect', () => {
    console.log('[V] Disconnected from socket realtime');
});

