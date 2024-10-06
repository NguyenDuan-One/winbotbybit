const Big = require('big.js');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
require('dotenv').config({
    path: "../.env"
});
const cron = require('node-cron');
const changeColorConsole = require('cli-color');
const TelegramBot = require('node-telegram-bot-api');
const { getAllSymbolMarginBE, getAllStrategiesActiveMarginBE } = require('../controllers/margin');
const { getAllSymbolSpotBE, getAllStrategiesActiveSpotBE, deleteStrategiesItemSpotBE } = require('../controllers/spot');
const { createPositionBE, getPositionBySymbol, deletePositionBE, updatePositionBE } = require('../controllers/positionV1');


const { RestClientV5, WebsocketClient } = require('bybit-api');

const wsConfig = {
    market: 'v5',
    recvWindow: 100000
}

const wsSymbol = new WebsocketClient(wsConfig);

const LIST_ORDER = ["order", "execution"]
// const LIST_ORDER = ["order"]
const MAX_ORDER_LIMIT = 20
const MAX_AMEND_LIMIT = 10
const RE_TP_ADAPTIVE = 5
const TP_ADAPTIVE = 80
const TP_NOT_ADAPTIVE = 60

const clientDigit = new RestClientV5({
    testnet: false,
});

// ----------------------------------------------------------------------------------
let missTPDataBySymbol = {}

var listKline = []
var allSymbol = []
var updatingAllMain = false

// ------- BTC ------------

var nangOCValue = 0
var checkOrderOCAll = true

var checkBTC07Price = ""
var haOCFunc = ""

// -------  ------------

var allStrategiesByCandleAndSymbol = {}
var symbolTradeTypeObject = {}
var trichMauOCListObject = {}
var trichMauTPListObject = {}

var allStrategiesByBotIDAndOrderID = {}
var allStrategiesByBotIDAndStrategiesID = {}
var allStrategiesByBotIDOrderOC = {}
var maxAmendOrderOCData = {}
var botApiList = {}
var digitAllCoinObject = {}
var botAmountListObject = {}
var botListTelegram = {}

// -------  ------------

var listOCByCandleBot = {}
// ----------------------------------------------------------------------------------

const roundPrice = (
    {
        price,
        tickSize
    }
) => {

    const priceFix = new Big(price)
    const tickSizeFIx = new Big(tickSize)

    return new Big(Math.floor(priceFix.div(tickSizeFIx).toNumber())).times(tickSizeFIx).toString();
}



// ----------------------------------------------------------------------------------


const cancelAllListOrderOC = async (listOCByCandleBotInput = {}) => {


    const allData = Object.values(listOCByCandleBotInput).reduce((pre, item) => {

        if (Object.values(item.listOC || {}).length > 0) {

            pre[item.ApiKey] = {
                listOC: {
                    ...(pre[item.ApiKey]?.listOC || {}),
                    ...item.listOC
                },
                ApiKey: item.ApiKey,
                SecretKey: item.SecretKey,
            }
        }
        return pre
    }, {});

    await handleCancelAllOrderOC(Object.values(allData || {}))

}
const Digit = async () => {// proScale
    let PScale = []
    await clientDigit.getInstrumentsInfo({
        category: 'spot',
    })
        .then((response) => {
            response.result.list.forEach((e) => {
                if (e.symbol.split("USDT")[1] === "") {
                    PScale.push({
                        symbol: e.symbol,
                        priceScale: e.priceFilter.tickSize,
                        minOrderQty: e.lotSizeFilter.minOrderQty,
                        maxOrderQty: e.lotSizeFilter.maxOrderQty,
                    })
                }
            })

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
    ApiKey,
    SecretKey,
    botName,
    botID,
    telegramID,
    telegramToken,
    coinOpen,
    isLeverage
}) => {

    !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID });

    !allStrategiesByBotIDOrderOC[botID] && (
        allStrategiesByBotIDOrderOC[botID] = {
            totalOC: 0,
            logError: false
        }
    );

    !listOCByCandleBot[botID] && (listOCByCandleBot[botID] = {
        listOC: {},
        ApiKey,
        SecretKey,
    });

    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.ordering = true

    const orderLinkId = uuidv4()


    if (allStrategiesByBotIDOrderOC[botID].totalOC < MAX_ORDER_LIMIT) {

        listOCByCandleBot[botID].listOC[strategyID] = {
            strategyID,
            symbol,
            side,
            botName,
            botID,
            orderLinkId
        }

        allStrategiesByBotIDOrderOC[botID].totalOC += 1

        allStrategiesByBotIDAndOrderID[botID][orderLinkId] = {
            strategy,
            coinOpen,
            OC: true
        }

        const client = new RestClientV5({
            testnet: false,
            key: ApiKey,
            secret: SecretKey,
            syncTimeBeforePrivateRequests: true,
        });

        await client
            .submitOrder({
                category: 'spot',
                symbol,
                side,
                positionIdx: 0,
                orderType: 'Limit',
                qty,
                price,
                orderLinkId,
                isLeverage
            })
            .then((response) => {
                if (response.retCode == 0) {

                    const newOrderID = response.result.orderId
                    const newOrderLinkID = response.result.orderLinkId

                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID = newOrderID
                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderLinkId = newOrderLinkID
                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.coinOpen = coinOpen

                    const text = `\n[+OC] Order OC ( ${strategy.OrderChange}% ) ( ${botName} - ${side} - ${symbol} ) successful`
                    console.log(text)
                    console.log(changeColorConsole.greenBright(`[_OC orderID_] ( ${botName} - ${side} - ${symbol} ): ${newOrderLinkID}`));

                    // sendMessageWithRetry({
                    //     messageText: text,
                    //     telegramID,
                    //     telegramToken
                    // })

                }
                else {
                    console.log(changeColorConsole.yellowBright(`\n[!] Ordered OC ( ${botName} - ${side} - ${symbol} ) failed: `, response.retMsg, price, qty))
                    delete allStrategiesByBotIDAndOrderID[botID][orderLinkId]
                    delete listOCByCandleBot[botID].listOC[strategyID]

                }
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.ordering = false
            })
            .catch((error) => {
                console.log(`\n[!] Ordered OC ( ${botName} - ${side} - ${symbol} ) error `, error)
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.ordering = false
                delete allStrategiesByBotIDAndOrderID[botID][orderLinkId]
                delete listOCByCandleBot[botID].listOC[strategyID]
            });
    }
    else {
        if (!allStrategiesByBotIDOrderOC[botID]?.logError) {
            console.log(changeColorConsole.redBright(`[!] LIMIT ORDER OC ( ${botName} )`));
            allStrategiesByBotIDOrderOC[botID].logError = true
            setTimeout(() => {

                allStrategiesByBotIDOrderOC[botID].logError = false
                allStrategiesByBotIDOrderOC[botID].totalOC = 0
            }, 1000)
        }
    }
}

const handleMoveOrderOC = async ({
    strategyID,
    symbol,
    price,
    orderId,
    side,
    ApiKey,
    SecretKey,
    botName,
    botID
}) => {
    // console.log(changeColorConsole.greenBright(`Price Move TP ( ${botName} - ${side} - ${symbol} - ${candle} ):`, price));
    !maxAmendOrderOCData[botID] && (
        maxAmendOrderOCData[botID] = {
            totalOC: 0,
            logError: false
        }
    );
    if (maxAmendOrderOCData[botID].totalOC < MAX_AMEND_LIMIT) {

        maxAmendOrderOCData[botID].totalOC += 1
        const client = new RestClientV5({
            testnet: false,
            key: ApiKey,
            secret: SecretKey,
            syncTimeBeforePrivateRequests: true,

        });
        await client
            .amendOrder({
                category: 'spot',
                symbol,
                price,
                orderId
            })
            .then((response) => {
                if (response.retCode == 0) {
                    console.log(`[->] Move Order OC ( ${botName} - ${side} - ${symbol} ) successful: ${price}`)
                }
                else {
                    console.log(changeColorConsole.yellowBright(`[!] Move Order OC ( ${botName} - ${side} - ${symbol} ) failed `, response.retMsg, price))
                }
            })
            .catch((error) => {
                console.log(`[!] Move Order OC ( ${botName} - ${side} - ${symbol} ) error `, error)
            });

    }
    else {
        if (!maxAmendOrderOCData[botID]?.logError) {
            console.log(changeColorConsole.redBright(`[!] LIMIT AMEND OC ( ${botName} )`));
            maxAmendOrderOCData[botID].logError = true
            setTimeout(() => {
                maxAmendOrderOCData[botID].logError = false
                maxAmendOrderOCData[botID].totalOC = 0
            }, 1000)
        }
    }
}

const handleSubmitOrderTP = async ({
    strategy,
    strategyID,
    symbol,
    side,
    qty,
    price,
    ApiKey,
    SecretKey,
    missState = false,
    botName,
    botID
}) => {

    // console.log(changeColorConsole.greenBright(`Price order TP ( ${botName} - ${side} - ${symbol} - ${candle} ):`, price));

    const botSymbolMissID = `${botID}-${symbol}`

    const orderLinkId = uuidv4()

    if (!missState) {
        allStrategiesByBotIDAndOrderID[botID][orderLinkId] = {
            strategy,
            TP: true
        }
    }
    const client = new RestClientV5({
        testnet: false,
        key: ApiKey,
        secret: SecretKey,
        syncTimeBeforePrivateRequests: true,

    });
    await client
        .submitOrder({
            category: 'spot',
            symbol,
            side,
            positionIdx: 0,
            orderType: 'Limit',
            qty,
            price,
            orderLinkId,
            reduceOnly: true
        })
        .then((response) => {
            if (response.retCode == 0) {
                const newOrderID = response.result.orderId
                const newOrderLinkID = response.result.orderLinkId

                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = newOrderID
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderLinkId = newOrderLinkID


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

                // if (missState) {

                //     // allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderFilled = true
                //     missTPDataBySymbol[botSymbolMissID].orderID = newOrderID
                //     missTPDataBySymbol[botSymbolMissID].ApiKey = ApiKey
                //     missTPDataBySymbol[botSymbolMissID].SecretKey = SecretKey
                //     missTPDataBySymbol[botSymbolMissID].botID = botID
                //     missTPDataBySymbol[botSymbolMissID].botName = botName
                // }


                console.log(`[+TP] Order TP ${missState ? "( MISS )" : ''} ( ${botName} - ${side} - ${symbol} ) successful:  ${qty}`)
                console.log(changeColorConsole.greenBright(`[_TP orderID_] ( ${botName} - ${side} - ${symbol} ): ${newOrderLinkID}`));

            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Order TP ${missState ? "( MISS )" : ''} - ( ${botName} - ${side} - ${symbol} ) failed `, response.retMsg, price))
                delete allStrategiesByBotIDAndOrderID[botID][orderLinkId]


            }
        })
        .catch((error) => {
            console.log(`[!] Order TP ${missState ? "( MISS )" : ''} - ( ${botName} - ${side} - ${symbol} ) error `, error)
            delete allStrategiesByBotIDAndOrderID[botID][orderLinkId]

            console.log("ERROR Order TP:", error)
        });
}


const moveOrderTP = async ({
    strategyID,
    symbol,
    price,
    orderId,
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
        syncTimeBeforePrivateRequests: true,

    });
    await client
        .amendOrder({
            category: 'spot',
            symbol,
            price,
            orderId
        })
        .then((response) => {
            if (response.retCode == 0) {
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = response.result.orderId
                console.log(`[->] Move Order TP ( ${botName} - ${side} - ${symbol} ) successful: ${price}`)
            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Move Order TP ( ${botName} - ${side} - ${symbol} ) failed `, response.retMsg))
                // allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = ""
            }
        })
        .catch((error) => {
            console.log(`[!] Move Order TP ( ${botName} - ${side} - ${symbol} ) error `, error)
            // allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = ""
        });

}

const handleMoveOrderTP = async ({
    strategyID,
    strategy,
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
            TPNew = TPOld - digitAllCoinObject[symbol]?.priceScale
        }
        else {
            TPNew = TPOld + digitAllCoinObject[symbol]?.priceScale
        }

        allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.price = TPNew

        const dataInput = {
            strategyID,
            symbol,
            price: roundPrice({
                price: TPNew,
                tickSize: digitAllCoinObject[symbol]?.priceScale
            }),
            orderId: allStrategiesByBotIDAndStrategiesID[botID][strategyID]?.TP.orderID,
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
    side,
    ApiKey,
    SecretKey,
    botName,
    botID
}) => {

    const client = new RestClientV5({
        testnet: false,
        key: ApiKey,
        secret: SecretKey,
        syncTimeBeforePrivateRequests: true,

    });

    !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled &&
        await client
            .cancelOrder({
                category: 'spot',
                symbol,
                orderId: allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID
            })
            .then((response) => {
                if (response.retCode == 0) {
                    console.log(`[V] Cancel order ( ${botName} - ${side} -  ${symbol} ) successful `);
                    cancelAll({ strategyID, botID })

                    allStrategiesByCandleAndSymbol[symbol][strategyID].ExpirePre = new Date()

                }
                else {
                    console.log(changeColorConsole.yellowBright(`[!] Cancel order ( ${botName} - ${side} -  ${symbol} ) failed `, response.retMsg))
                    allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID = ""
                }
            })
            .catch((error) => {
                console.log(`[!] Cancel order ( ${botName} - ${side} -  ${symbol} ) error `, error)
                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID = ""

            });

}


const handleCancelAllOrderOC = async (items = [], batchSize = 10) => {

    if (items.length > 0) {
        await Promise.allSettled(items.map(async item => {
            const client = new RestClientV5({
                testnet: false,
                key: item.ApiKey,
                secret: item.SecretKey,
                syncTimeBeforePrivateRequests: true,

            });
            const list = Object.values(item.listOC || {})

            if (list.length > 0) {
                console.log(`[...] Total OC Can Be Cancelled: ${list.length}`);
                let index = 0;
                const listCancel = {}
                while (index < list.length) {
                    const batch = list.slice(index, index + batchSize);

                    const newList = batch.reduce((pre, cur) => {
                        const curOrderLinkId = cur.orderLinkId

                        const botIDTemp = cur.botID
                        const strategyIDTemp = cur.strategyID

                        if (!allStrategiesByBotIDAndStrategiesID?.[botIDTemp]?.[strategyIDTemp]?.OC?.orderFilled) {
                            pre.push({
                                symbol: cur.symbol,
                                orderLinkId: curOrderLinkId,
                            })
                            listCancel[curOrderLinkId] = cur
                        }
                        else {
                            console.log(`[V] Cancel order ( ${cur.botName} - ${cur.side} -  ${cur.symbol} ) has been filled `);
                            delete listOCByCandleBot[botIDTemp].listOC[strategyIDTemp]
                        }
                        return pre
                    }, [])

                    console.log(`[...] Canceling ${newList.length} OC`);

                    const res = await client.batchCancelOrders("spot", newList)
                    const listSuccess = res.result.list || []
                    const listSuccessCode = res.retExtInfo.list || []


                    listSuccess.forEach((item, index) => {
                        const data = listCancel[item.orderLinkId]
                        const codeData = listSuccessCode[index]
                        const botIDTemp = data.botID
                        const strategyIDTemp = data.strategyID
                        const candleTemp = data.candle

                        if (codeData.code == 0) {
                            console.log(`[V] Cancel order ( ${data.botName} - ${data.side} -  ${data.symbol} ) successful `);
                            cancelAll({
                                botID: botIDTemp,
                                strategyID: strategyIDTemp,
                            })
                        }
                        else {
                            allStrategiesByBotIDAndStrategiesID[botIDTemp][strategyIDTemp].OC.orderID = ""
                            console.log(changeColorConsole.yellowBright(`[!] Cancel order ( ${data.botName} - ${data.side} -  ${data.symbol} ) failed `, codeData.msg));
                        }
                        delete listOCByCandleBot[botIDTemp].listOC[strategyIDTemp]
                    })

                    await delay(1000)
                    index += batchSize
                }
            }
        }))
        console.log("[V] Cancel All OC Successful");

    }

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
        syncTimeBeforePrivateRequests: true,

    });
    orderId && await client
        .cancelOrder({
            category: 'spot',
            symbol,
            orderId,
        })
        .then((response) => {
            if (response.retCode == 0) {
                console.log(`[V] Cancel TP ( ${botName} - ${side} - ${symbol} - ${candle} ) successful `);

                if (gongLai && !missTPDataBySymbol[botSymbolMissID].gongLai) {
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
                    // resetMissData({
                    //     botID,
                    //     symbol
                    // })
                }
            }
            else {
                console.log(changeColorConsole.yellowBright(`[!] Cancel TP ( ${botName} - ${side} - ${symbol} - ${candle} ) failed `, response.retMsg))
            }
            cancelAll({ strategyID, botID })
            // allStrategiesByBotIDOrderOC[botID][symbol].totalOC -= 1

        })
        .catch((error) => {
            console.log(`[!] Cancel TP ( ${botName} - ${side} - ${symbol} - ${candle} ) error `, error)
            cancelAll({ strategyID, botID })
        });

}

async function handleCancelAllOrderTP({
    items,
    batchSize = 10
}) {
    if (items.length > 0) {
        console.log(`[...] Canceling TP`);

        let index = 0;
        while (index < items.length) {
            const batch = items.slice(index, index + batchSize);
            await Promise.allSettled(batch.map(item => handleCancelOrderTP({
                strategyID: item.strategyID,
                symbol: item.symbol,
                candle: item.candle,
                side: item.side,
                ApiKey: item.ApiKey,
                SecretKey: item.SecretKey,
                botName: item.botName,
                botID: item.botID,
                orderId: item.orderId,
                gongLai: item.gongLai,
            })));
            await delay(1000)
            index += batchSize

        }
    }
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
    if (botID && strategyID) {
        const data = allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
        if (data) {
            const OCOrderID = data?.OC?.orderLinkId
            const TPOrderID = data?.TP?.orderLinkId
            OCOrderID && delete allStrategiesByBotIDAndOrderID[botID]?.[OCOrderID]
            TPOrderID && delete allStrategiesByBotIDAndOrderID[botID]?.[TPOrderID]
        }
        !allStrategiesByBotIDAndOrderID[botID] && (allStrategiesByBotIDAndOrderID[botID] = {});
        !allStrategiesByBotIDAndStrategiesID[botID] && (allStrategiesByBotIDAndStrategiesID[botID] = {});

        allStrategiesByBotIDAndStrategiesID[botID][strategyID] = {
            "OC": {
                orderID: "",
                orderLinkId: "",
                orderFilled: false,
                openTrade: "",
                dataSend: {},
                priceOrder: 0,
                orderFilledButMiss: false,
                moveAfterCompare: false,
                newOC: 0,
                coinOpen: 0,
                ordering: false
            },
            "TP": {
                orderID: "",
                orderLinkId: "",
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

// const getMoneyFuture = async (botApiListInput) => {

//     const list = Object.values(botApiListInput)
//     if (list.length > 0) {
//         const resultGetFuture = await Promise.allSettled(list.map(async botData => getFutureBE(botData.id)))

//         if (resultGetFuture.length > 0) {
//             resultGetFuture.forEach(({ value: data }) => {
//                 if (data?.botID) {
//                     botAmountListObject[data.botID] = +data?.totalWalletBalance || 0
//                 }
//             })
//         }
//     }
// }

const sendAllBotTelegram = async (BTCPricePercent) => {
    const text = `<b>❗ BTC đang biến động ${BTCPricePercent}% [1m] ❗</b>`
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

            // await getMoneyFuture(botApiListInput)

            await Promise.allSettled(objectToArray.map(botApiData => {

                const ApiKey = botApiData.ApiKey
                const SecretKey = botApiData.SecretKey
                const botID = botApiData.id
                const botName = botApiList[botID].botName


                // allSymbol.forEach(symbol => {
                //     resetMissData({
                //         botID,
                //         symbol: symbol.value
                //     })
                // })

                const wsConfigOrder = {
                    testnet: false,
                    key: ApiKey,
                    secret: SecretKey,
                    market: 'v5',
                    recvWindow: 100000
                }

                const wsOrder = new WebsocketClient(wsConfigOrder);


                wsOrder.subscribeV5(LIST_ORDER, 'spot').then(() => {


                    console.log(`[V] Subscribe order ( ${botName} ) successful\n`);

                    wsOrder.on('update', async (dataCoin) => {

                        const botID = botApiData.id

                        const ApiKey = botApiList[botID].ApiKey
                        const SecretKey = botApiList[botID].SecretKey
                        const botName = botApiList[botID].botName

                        const telegramID = botApiList[botID].telegramID
                        const telegramToken = botApiList[botID].telegramToken

                        const topicMain = dataCoin.topic
                        const dataMainAll = dataCoin.data


                        ApiKey && SecretKey && await Promise.allSettled(dataMainAll.map(async dataMain => {

                            const symbol = dataMain.symbol
                            const orderID = dataMain.orderLinkId
                            const orderStatus = dataMain.orderStatus


                            const botSymbolMissID = `${botID}-${symbol}`

                            if (orderStatus === "Filled") {
                                console.log(changeColorConsole.greenBright(`[V] Filled OrderID ( ${botName} - ${dataMain.side} - ${symbol} ):`, orderID));
                            }
                            if (orderStatus === "PartiallyFilled") {
                                console.log(changeColorConsole.blueBright(`[V] PartiallyFilled OrderID( ${botName} - ${dataMain.side} - ${symbol}):`, dataMain.qty));
                            }

                            if (topicMain === "order") {

                                const strategyData = allStrategiesByBotIDAndOrderID[botID]?.[orderID]

                                const strategy = strategyData?.strategy
                                const OCTrue = strategyData?.OC
                                const TPTrue = strategyData?.TP


                                if (strategy) {

                                    const strategyID = strategy.value

                                    const TPMain = strategy.Adaptive ? TP_ADAPTIVE : TP_NOT_ADAPTIVE

                                    // const coinOpenOC = allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.coinOpen || strategy.coinOpen

                                    if (orderStatus === "Filled") {

                                        if (OCTrue) {

                                            const coinOpenOC = strategyData.coinOpen
                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderFilled = true

                                            const openTrade = +dataMain.avgPrice  //Gia khop lenh

                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.openTrade = openTrade

                                            const sideText = strategy.PositionSide === "Long" ? "Buy" : "Sell"

                                            const qty = dataMain.qty

                                            // const newOC = (Math.abs((openTrade - coinOpenOC)) / coinOpenOC * 100).toFixed(2)

                                            // allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.newOC = newOC

                                            const priceOldOrder = (strategy.Amount / 100).toFixed(2)

                                            console.log(`\n\n[V] Filled OC: \n${symbol.replace("USDT", "")} | Open ${strategy.PositionSide} \nBot: ${botName} | OC: ${strategy.OrderChange}% | TP: ${TPMain}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}\n`);
                                            const teleText = `<b>${symbol.replace("USDT", "")}</b> | Open ${strategy.PositionSide} \nBot: ${botName} | OC: ${strategy.OrderChange}% | TP: ${TPMain}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}`
                                            // const teleText = `<b>${symbol.replace("USDT", "")}</b> | Open ${sideText} \nBot: ${botName} | OC: ${strategy.OrderChange}% | TP: ${TPMain}% \nPrice: ${openTrade} | Amount: ${priceOldOrder}`

                                            if (!missTPDataBySymbol[botSymbolMissID]?.orderIDToDB) {

                                                const Quantity = dataMain.side === "Buy" ? qty : (qty * -1)

                                                const newDataToDB = {
                                                    Symbol: symbol,
                                                    Side: dataMain.side,
                                                    Quantity,
                                                    TradeType: symbolTradeTypeObject[symbol]
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
                                                TPNew = openTrade + Math.abs((openTrade - coinOpenOC)) * (TPMain / 100)
                                            }
                                            else {
                                                TPNew = openTrade - Math.abs((openTrade - coinOpenOC)) * (TPMain / 100)
                                            }
                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.side = strategy.PositionSide === "Long" ? "Sell" : "Buy"

                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.price = TPNew


                                            allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.qty = qty

                                            const dataInput = {
                                                strategy,
                                                strategyID,
                                                symbol,
                                                // qty,
                                                qty: roundPrice({
                                                    price: qty - strategy.minOrderQty,
                                                    tickSize: strategy.minOrderQty
                                                }),
                                                price: roundPrice({
                                                    price: TPNew,
                                                    tickSize: digitAllCoinObject[symbol]?.priceScale
                                                }),
                                                // price:(Math.floor(TPNew / digitAllCoinObject[symbol]?.priceScale) * digitAllCoinObject[symbol]?.priceScale).toString(),
                                                side: strategy.PositionSide === "Long" ? "Sell" : "Buy",
                                                ApiKey,
                                                SecretKey,
                                                botName,
                                                botID
                                            }

                                            console.log("dataInput.Qty", dataInput.qty);


                                            handleSubmitOrderTP(dataInput)

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
                                            const priceOldOrder = (strategy.Amount / 100).toFixed(2)

                                            // const newOC = allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.newOC

                                            console.log(`\n\n[V] Filled TP: \n${symbol.replace("USDT", "")} | Close ${strategy.PositionSide} \nBot: ${botName} | OC: ${strategy.OrderChange}% | TP: ${TPMain}% \nPrice: ${closePrice} | Amount: ${priceOldOrder}\n`);
                                            const teleText = `<b>${symbol.replace("USDT", "")}</b> | Close ${strategy.PositionSide} \nBot: ${botName} | OC: ${strategy.OrderChange}% | TP: ${TPMain}% \nPrice: ${closePrice} | Amount: ${priceOldOrder}`
                                            // const teleText = `<b>${symbol.replace("USDT", "")}</b> | Close ${side} \nBot: ${botName} | OC: ${strategy.OrderChange}% | TP: ${TPMain}% \nPrice: ${closePrice} | Amount: ${priceOldOrder}`

                                            const priceWinPercent = (Math.abs(closePrice - openTradeOCFilled) / openTradeOCFilled * 100).toFixed(2) || 0;
                                            const priceWin = ((closePrice - openTradeOCFilled) * qty).toFixed(2) || 0;

                                            let textWinLose = ""

                                            if (side === "Buy") {
                                                if (priceWin > 0) {
                                                    textWinLose = `\n✅ [WIN - LONG]: ${priceWin} | ${priceWinPercent}%\n`
                                                    console.log(changeColorConsole.greenBright(textWinLose));
                                                    allStrategiesByCandleAndSymbol[symbol][strategyID].preIsWin = true
                                                }
                                                else {
                                                    textWinLose = `\n❌ [LOSE - LONG]: ${priceWin} | ${priceWinPercent}%\n`
                                                    console.log(changeColorConsole.magentaBright(textWinLose));
                                                    allStrategiesByCandleAndSymbol[symbol][strategyID].preIsLose = true
                                                }
                                            }
                                            else {
                                                if (priceWin > 0) {
                                                    textWinLose = `\n❌ [LOSE - SHORT]: ${-1 * priceWin} | ${priceWinPercent}%\n`
                                                    console.log(changeColorConsole.magentaBright(textWinLose));
                                                    allStrategiesByCandleAndSymbol[symbol][strategyID].preIsLose = true
                                                }
                                                else {
                                                    textWinLose = `\n✅ [WIN - SHORT]: ${Math.abs(priceWin)} | ${priceWinPercent}%\n`
                                                    console.log(changeColorConsole.greenBright(textWinLose));
                                                    allStrategiesByCandleAndSymbol[symbol][strategyID].preIsWin = true
                                                }
                                            }

                                            missTPDataBySymbol[botSymbolMissID].size -= Math.abs(qty)

                                            // Fill toàn bộ
                                            if (missTPDataBySymbol[botSymbolMissID]?.sizeTotal == qty || missTPDataBySymbol[botSymbolMissID]?.size == 0) {
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

                                            }
                                            else {
                                                console.log(`\n[_Part Filled_] Filled TP ( ${botName} - ${side} - ${symbol} - ${strategy.Candlestick} )\n`);
                                            }

                                            cancelAll({ strategyID, botID })

                                            delete listOCByCandleBot[botID].listOC[strategyID]


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
                                            console.log(`[-] Cancelled TP ( ${botName} - ${strategy.PositionSide === "Long" ? "Sell" : "Buy"} - ${symbol} - ${strategy.Candlestick} ) - Chốt lời `);

                                            // allStrategiesByBotIDOrderOC[botID][symbol].totalOC -= 1

                                            if (allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID) {
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].TP.orderID = ""
                                            }

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
                                                // resetMissData({
                                                //     botID,
                                                //     symbol,
                                                // })
                                            }

                                        }
                                        else if (OCTrue) {
                                            // allStrategiesByBotIDOrderOC[botID][symbol].totalOC -= 1

                                            console.log(`[-] Cancelled OC ( ${botName} - ${strategy.PositionSide === "Long" ? "Sell" : "Buy"} - ${symbol} ) `);
                                            if (allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID) {
                                                allStrategiesByBotIDAndStrategiesID[botID][strategyID].OC.orderID = ""
                                            }
                                            listOCByCandleBot?.[botID]?.list[strategyID] && delete listOCByCandleBot[botID].list[strategyID]
                                        }

                                    }
                                }
                            }

                            else if (topicMain === "execution") {

                                const size = Math.abs(dataMain.execQty)

                                !missTPDataBySymbol[botSymbolMissID] && resetMissData({ botID, symbol })

                                missTPDataBySymbol[botSymbolMissID].sizeTotal = size

                                if (size > 0) {
                                    missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)
                                    missTPDataBySymbol[botSymbolMissID].timeOutFunc = setTimeout(async () => {

                                        const symbol = dataMain.symbol
                                        const side = dataMain.side
                                        const openTrade = +dataMain.execPrice  //Gia khop lenh

                                        const size = Math.abs(dataMain.size)

                                        missTPDataBySymbol[botSymbolMissID].sizeTotal = size

                                        const missSize = size - missTPDataBySymbol[botSymbolMissID].size

                                        const Quantity = side === "Buy" ? size : (size * -1)

                                        if (!missTPDataBySymbol[botSymbolMissID]?.orderIDToDB) {

                                            const newDataToDB = {
                                                Symbol: symbol,
                                                Side: side,
                                                Quantity,
                                                TradeType: symbolTradeTypeObject[symbol]
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
                                            if (missSize > 0 && !missTPDataBySymbol[botSymbolMissID]?.orderID) {


                                                const teleText = `<b>⚠️ [ MISS ] | ${symbol.replace("USDT", "")}</b> - ${side} - Bot: ${botName}  \n`
                                                console.log(changeColorConsole.redBright(`\n${teleText.slice(5)}\n`));

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

                                                // const dataInput = {
                                                //     symbol,
                                                //     qty: missSize.toString(),
                                                //     price: roundPrice({
                                                //         price: TPNew,
                                                //         tickSize: digitAllCoinObject[symbol]
                                                //     }),
                                                //     side: side === "Buy" ? "Sell" : "Buy",
                                                //     ApiKey,
                                                //     SecretKey,
                                                //     missState: true,
                                                //     botName,
                                                //     botID,
                                                // }

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
                                            // else {
                                            //     console.log(`[_ Not Miss _] TP ( ${botName} - ${side} - ${symbol}} )`);
                                            //     updatePositionBE({
                                            //         newDataUpdate: {
                                            //             Miss: false,
                                            //             TimeUpdated: new Date()
                                            //         },
                                            //         orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                            //     }).then(message => {
                                            //         console.log(message);
                                            //     }).catch(err => {
                                            //         console.log("ERROR updatePositionBE:", err)
                                            //     })
                                            // }
                                        }
                                        else {
                                            const teleText = `<b>⚠️ [ MISS-GongLai ] | ${symbol.replace("USDT", "")}</b> - ${side} - Bot: ${botName}  \n`
                                            console.log(changeColorConsole.redBright(`\n${teleText.slice(5)}\n`));
                                            // updatePositionBE({
                                            //     newDataUpdate: {
                                            //         Miss: true,
                                            //         TimeUpdated: new Date()
                                            //     },
                                            //     orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                            // }).then(message => {
                                            //     console.log(message);
                                            // }).catch(err => {
                                            //     console.log("ERROR updatePositionBE:", err)
                                            // })
                                        }

                                    }, 2000)
                                }
                                else {
                                    missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)
                                }
                            }


                            // User cancel vị thế ( Limit )
                            if (!orderID && (orderStatus === "New" || orderStatus === "Filled") && dataMain.orderType !== "Market") {

                                console.log(`[...] User ( ${botName} ) Clicked Close Vị Thế (Limit) - ( ${symbol} )`)

                                const botSymbolMissID = `${botID}-${symbol}`

                                // const listMiss = missTPDataBySymbol[botSymbolMissID]?.orderIDOfListTP

                                // listMiss?.length > 0 && await handleCancelAllOrderTP({
                                //     items: listMiss.map((orderIdTPData) => ({
                                //         ApiKey,
                                //         SecretKey,
                                //         strategyID: orderIdTPData?.strategyID,
                                //         symbol,
                                //         side: dataMain.side,
                                //         orderId: orderIdTPData?.orderID,
                                //         botID,
                                //         botName
                                //     }))
                                // })

                                missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)

                                resetMissData({ botID, symbol })

                                missTPDataBySymbol[botSymbolMissID].orderIDOfListTP.push({
                                    orderID: dataMain.orderId,
                                })
                                missTPDataBySymbol[botSymbolMissID].size = Math.abs(dataMain.qty)
                            }
                            // User cancel vị thế ( Market )
                            if (dataMain.orderType === "Market") {

                                console.log(`[...] User ( ${botName} ) Clicked Close Vị Thế (Market) - ( ${symbol} )`)

                                if (missTPDataBySymbol[botSymbolMissID]?.orderIDToDB) {
                                    await deletePositionBE({
                                        orderID: missTPDataBySymbol[botSymbolMissID].orderIDToDB
                                    }).then(message => {
                                        console.log(message);
                                    }).catch(err => {
                                        console.log("ERROR deletePositionBE:", err)
                                    })
                                }

                                resetMissData({ botID, symbol })


                            }

                        }))

                    })

                    wsOrder.on('close', () => {
                        console.log('Connection order closed');
                        wsOrder.connectPrivate(LIST_ORDER, "spot")
                    });

                    wsOrder.on('reconnected', () => {
                        console.log('Reconnected order successful')
                    });

                    wsOrder.on('error', (err) => {
                        console.log('Connection order error');
                        console.log(err);
                    });
                }).catch(err => {
                    console.log(`[V] Subscribe order ( ${botName} ) error:`, err)
                })



            }))
        }
    } catch (error) {
        console.log("[!] Error BotApi Socket:", e)
    }
}

const handleSocketListKline = async (listKlineInput) => {

    await wsSymbol.subscribeV5(listKlineInput, 'spot').then(() => {

        console.log("[V] Subscribe kline successful\n");

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


    const getAllSymbolSpot = getAllSymbolSpotBE()
    const getAllSymbolMargin = getAllSymbolMarginBE()
    const getAllConfigSpot = getAllStrategiesActiveSpotBE()
    const getAllConfigMargin = getAllStrategiesActiveMarginBE()

    const allRes = await Promise.allSettled([getAllSymbolSpot, getAllSymbolMargin, getAllConfigSpot, getAllConfigMargin])

    const allSymbolRes = [
        ...allRes[0].value || [],
        ...allRes[1].value || [],
    ]
    const getAllConfigRes = [
        ...allRes[2].value || [],
        ...allRes[3].value || [],
    ]

    listKline = [...new Set(allSymbolRes.map(symbolData => {
        const symbol = symbolData.value
        trichMauOCListObject[symbol] = {
            preTime: 0
        }
        symbolTradeTypeObject[symbol] = symbolData.type

        return `kline.1.${symbol}`
    }))]



    getAllConfigRes.forEach(strategyItem => {
        if (checkConditionBot(strategyItem)) {

            const strategyID = strategyItem.value

            const botID = strategyItem.botID._id
            const botName = strategyItem.botID.botName
            const symbol = strategyItem.symbol

            botApiList[botID] = {
                id: botID,
                botName,
                ApiKey: strategyItem.botID.ApiKey,
                SecretKey: strategyItem.botID.SecretKey,
                telegramID: strategyItem.botID.telegramID,
                telegramToken: strategyItem.botID.telegramToken,
            }

            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {});
            allStrategiesByCandleAndSymbol[symbol][strategyID] = strategyItem;

            cancelAll({ strategyID, botID })

        }
    })

    const resultDigitAll = await Digit()
    resultDigitAll?.length > 0 && (
        resultDigitAll.reduce((pre, cur) => {
            if (cur.symbol.includes("USDT")) {
                pre[cur.symbol] = {
                    priceScale: cur.priceScale,
                    minOrderQty: +cur.minOrderQty,
                    maxOrderQty: +cur.maxOrderQty,
                }
            }
            return pre
        }, digitAllCoinObject)
    );


    await handleSocketBotApiList(botApiList)

    await handleSocketListKline(listKline)

    wsSymbol.on('update', async (dataCoin) => {

        const [_, candle, symbol] = dataCoin.topic.split(".");

        const dataMain = dataCoin.data[0]

        const coinCurrent = +dataMain.close
        const coinOpen = +dataMain.open

        const listDataObject = allStrategiesByCandleAndSymbol?.[symbol]


        listDataObject && Object.values(listDataObject)?.length > 0 && await Promise.allSettled(Object.values(listDataObject).map(async strategy => {

            if (checkConditionBot(strategy) && strategy.IsActive && !updatingAllMain) {

                console.log("strategy.Amount", strategy.Amount);
                console.log("strategy.OrderChange", strategy.OrderChange);

                const strategyID = strategy.value

                digitAllCoinObject[symbol]?.priceScale

                const botID = strategy.botID._id
                const botName = strategy.botID.botName

                const ApiKey = strategy.botID.ApiKey
                const SecretKey = strategy.botID.SecretKey
                const telegramID = strategy.botID.telegramID
                const telegramToken = strategy.botID.telegramToken
                const side = strategy.PositionSide === "Long" ? "Buy" : "Sell"


                // Gắn time limit config
                !strategy.ExpirePre && (strategy.ExpirePre = new Date());
                !strategy.AmountOld && (strategy.AmountOld = strategy.Amount);
                !strategy.AmountExpirePre && (strategy.AmountExpirePre = new Date());

                //Check expire config - OK
                if (strategy.Expire && new Date() - strategy.ExpirePre >= strategy.Expire * 60 * 1000) {
                    // const [parentID, id] = strategy.value.split("-")
                    // deleteStrategiesItemSpotBE({ id, parentID }).then(message => {
                    //     console.log(message);
                    // }).catch(err => {
                    //     console.log(err.message);
                    // })
                    // strategy.IsActive = false
                    // delete allStrategiesByCandleAndSymbol?.[symbol]?.[strategyID]

                    // cancel OC
                    handleCancelOrderOC({
                        strategyID,
                        symbol,
                        side,
                        ApiKey,
                        SecretKey,
                        botName,
                        botID
                    })

                }

                //Check expire Increase-Amount - OK
                if (strategy.AmountExpire && new Date() - strategy.AmountExpirePre >= strategy.AmountExpire * 60 * 1000) {
                    strategy.Amount = strategy.AmountOld
                    strategy.AmountExpirePre = new Date()
                }


                let priceOrderOC = 0
                let qty = 0

                if (side === "Buy") {
                    priceOrderOC = coinCurrent - coinCurrent * strategy.OrderChange / 100
                }
                else {
                    priceOrderOC = coinCurrent + coinCurrent * strategy.OrderChange / 100
                }

                qty = (strategy.Amount / +priceOrderOC)

                // qty < digitAllCoinObject[symbol]?.minOrderQty && (qty = digitAllCoinObject[symbol].minOrderQty);
                // qty > digitAllCoinObject[symbol]?.maxOrderQty && (qty = digitAllCoinObject[symbol].maxOrderQty);

                const dataInput = {
                    strategy,
                    strategyID,
                    ApiKey,
                    SecretKey,
                    symbol,
                    qty: qty.toFixed(0),
                    side,
                    price: roundPrice({
                        price: priceOrderOC,
                        tickSize: digitAllCoinObject[symbol]?.priceScale
                    }),
                    botName,
                    botID,
                    telegramID,
                    telegramToken,
                    coinOpen,
                    isLeverage: symbolTradeTypeObject[symbol] === "Spot" ? 0 : 1
                }

                console.log(dataInput.qty);


                if (!allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderID && !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.ordering) {

                    if (strategy.preIsWin) {
                        const newAmount = strategy.Amount + strategy.Amount * strategy.AmountAutoPercent / 100
                        newAmount <= strategy.Limit && (strategy.Amount = newAmount);
                    }
                    else if (strategy.preIsLose) {
                        strategy.OrderChange = strategy.OrderChange + strategy.OrderChange * strategy.AmountIncreaseOC / 100
                    }

                    let priceOrderOCNew = 0
                    if (side === "Buy") {
                        priceOrderOCNew = coinCurrent - coinCurrent * strategy.OrderChange / 100
                    }
                    else {
                        priceOrderOCNew = coinCurrent + coinCurrent * strategy.OrderChange / 100
                    }

                    const qtyNew = (strategy.Amount / +priceOrderOCNew)

                    dataInput.price = roundPrice({
                        price: priceOrderOCNew,
                        tickSize: digitAllCoinObject[symbol]?.priceScale
                    })

                    // qtyNew < digitAllCoinObject[symbol]?.minOrderQty && (qtyNew = digitAllCoinObject[symbol].minOrderQty);
                    // qtyNew > digitAllCoinObject[symbol]?.maxOrderQty && (qtyNew = digitAllCoinObject[symbol].maxOrderQty);

                    dataInput.qty = qtyNew.toFixed(0)

                    if (qtyNew > 0) {
                        handleSubmitOrder(dataInput)
                    }
                    else {
                        console.log(changeColorConsole.yellowBright(`\n[!] Ordered OC ( ${botName} - ${side} - ${symbol} ) failed: ( QTY : ${qtyNew} ) `))
                    }
                }
                else if (allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderID &&
                    !allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderFilled &&
                    new Date() - trichMauOCListObject[symbol].preTime >= 1000) {
                    handleMoveOrderOC({
                        ...dataInput,
                        orderId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderID
                    })
                }
                else if (allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.orderID &&
                    strategy.Adaptive &&
                    new Date() - trichMauOCListObject[symbol].preTime >= 1000) {
                    handleMoveOrderTP({
                        ...dataInput,
                        orderId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.TP?.orderID
                    })
                }



            }
        }))

        trichMauOCListObject[symbol].preTime = new Date()

    })

    wsSymbol.on('close', () => {
        console.log('[V] Connection listKline closed');
        wsSymbol.unsubscribeV5(listKline, "spot")
    });

    wsSymbol.on('reconnected', () => {
        console.log('[V] Reconnected listKline successful')
    });

    wsSymbol.on('error', (err) => {
        console.log('[!] Connection listKline error');
        console.log(err);
    });

}

try {
    Main()

    // setTimeout(() => {
    //     cron.schedule('*/1 * * * *', () => {
    //         getMoneyFuture(botApiList)
    //     });
    // }, 1000)


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

            const ApiKey = newStrategiesData.botID.ApiKey
            const SecretKey = newStrategiesData.botID.SecretKey


            if (!botApiList[botID]) {
                botApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID: newStrategiesData.botID.telegramID,
                    telegramToken: newStrategiesData.botID.telegramToken,
                }
                newBotApiList[botID] = {
                    id: botID,
                    botName,
                    ApiKey,
                    SecretKey,
                    telegramID: newStrategiesData.botID.telegramID,
                    telegramToken: newStrategiesData.botID.telegramToken,
                }

                // !allStrategiesByBotIDOrderOC[botID] && (allStrategiesByBotIDOrderOC[botID] = {})
                // !allStrategiesByBotIDOrderOC[botID][symbol] && (
                //     allStrategiesByBotIDOrderOC[botID][symbol] = {
                //         totalOC: 0,
                //         logError: false
                //     }
                // )
            }



            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {});
            allStrategiesByCandleAndSymbol[symbol][strategyID] = newStrategiesData;

            cancelAll({ strategyID, botID })

        }

    }))

    // handleSocketBotApiList(newBotApiList)

});

socketRealtime.on('update', async (newData = []) => {
    console.log("[...] Update Strategies From Realtime", newData.length);

    updatingAllMain = true

    const newBotApiList = {}

    const listOrderOC = {}
    const listOrderTP = []

    await Promise.allSettled(newData.map((strategiesData) => {

        if (checkConditionBot(strategiesData)) {

            const ApiKey = strategiesData.botID.ApiKey
            const SecretKey = strategiesData.botID.SecretKey
            const botID = strategiesData.botID._id
            const botName = strategiesData.botID.botName

            const symbol = strategiesData.symbol
            const strategyID = strategiesData.value
            const IsActive = strategiesData.IsActive


            const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

            const botSymbolMissID = `${botID}-${symbol}`

            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {});
            allStrategiesByCandleAndSymbol[symbol][strategyID] = strategiesData

            !allStrategiesByBotIDAndOrderID[botID] && (allStrategiesByBotIDAndOrderID[botID] = {});
            !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID });


            if (IsActive) {
                if (!botApiList[botID]) {
                    botApiList[botID] = {
                        id: botID,
                        botName,
                        ApiKey,
                        SecretKey,
                        telegramID: strategiesData.botID.telegramID,
                        telegramToken: strategiesData.botID.telegramToken,
                    }

                    newBotApiList[botID] = {
                        id: botID,
                        botName,
                        ApiKey,
                        SecretKey,
                        telegramID: strategiesData.botID.telegramID,
                        telegramToken: strategiesData.botID.telegramToken,
                    }

                    // !allStrategiesByBotIDOrderOC[botID] && (allStrategiesByBotIDOrderOC[botID] = {})
                    // !allStrategiesByBotIDOrderOC[botID][symbol] && (
                    //     allStrategiesByBotIDOrderOC[botID][symbol] = {
                    //         totalOC: 0,
                    //         logError: false
                    //     }
                    // )
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


            if (!strategiesData.IsActive) {

                allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID && listOrderTP.push({
                    ...cancelDataObject,
                    orderId: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID,
                    gongLai: true
                })

                !listOrderOC[botID] && (listOrderOC[botID] = {});
                !listOrderOC[botID].listOC && (listOrderOC[botID] = {
                    listOC: {},
                    ApiKey,
                    SecretKey,
                });

                allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId && (listOrderOC[botID].listOC[strategyID] = {
                    strategyID,
                    symbol,
                    side,
                    botName,
                    botID,
                    orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId
                });

                // handleCancelOrderTP({
                //     ...cancelDataObject,
                //     orderId: missTPDataBySymbol[botSymbolMissID]?.orderID,
                //     gongLai: true
                // })
            }

        }

    }))


    const cancelAllOC = cancelAllListOrderOC(listOrderOC)

    const cancelAllTP = handleCancelAllOrderTP({
        items: listOrderTP
    })

    await Promise.allSettled([cancelAllOC, cancelAllTP])
    await handleSocketBotApiList(newBotApiList)

    updatingAllMain = false
});

socketRealtime.on('delete', async (newData) => {
    console.log("[...] Deleted Strategies From Realtime", newData.length);
    updatingAllMain = true

    const listOrderOC = {}
    const listOrderTP = []

    await Promise.allSettled(newData.map((strategiesData, index) => {
        if (checkConditionBot(strategiesData)) {

            const ApiKey = strategiesData.botID.ApiKey
            const SecretKey = strategiesData.botID.SecretKey

            const symbol = strategiesData.symbol
            const strategyID = strategiesData.value
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

            allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID && listOrderTP.push({
                ...cancelDataObject,
                orderId: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID,
                gongLai: true
            })

            !listOrderOC[botID] && (listOrderOC[botID] = {});
            !listOrderOC[botID].listOC && (listOrderOC[botID] = {
                listOC: {},
                ApiKey,
                SecretKey,
            });

            allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId && (listOrderOC[botID].listOC[strategyID] = {
                strategyID,
                symbol,
                side,
                botName,
                botID,
                orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId
            });

            // handleCancelOrderTP({
            //     ...cancelDataObject,
            //     orderId: missTPDataBySymbol[botSymbolMissID]?.orderID,
            //     gongLai: true
            // })


            delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
            delete allStrategiesByCandleAndSymbol[symbol]?.[strategyID]
        }
    }))

    const cancelAllOC = cancelAllListOrderOC(listOrderOC)

    const cancelAllTP = handleCancelAllOrderTP({
        items: listOrderTP
    })

    await Promise.allSettled([cancelAllOC, cancelAllTP])
    updatingAllMain = false

});


socketRealtime.on('bot-update', async (data = {}) => {
    const { newData, botIDMain, botActive } = data;
    updatingAllMain = true

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
    //         recvWindow: 100000
    //     }

    //     const wsOrder = new WebsocketClient(wsConfigOrder);

    //     if (botActive) {
    //         await wsOrder.subscribeV5(LIST_ORDER, 'spot')
    //     }
    //     else {
    //         console.log(`[V] UnsubscribeV5 ( ${botNameExist} )`);
    //         await wsOrder.unsubscribeV5(LIST_ORDER, 'spot')
    //     }
    // }
    const listOrderOC = {}
    const listOrderTP = []

    await Promise.allSettled(newData.map((strategiesData, index) => {

        const ApiKey = strategiesData.botID.ApiKey
        const SecretKey = strategiesData.botID.SecretKey
        const botID = strategiesData.botID._id
        const botName = strategiesData.botID.botName

        const symbol = strategiesData.symbol
        const strategyID = strategiesData.value
        const IsActive = strategiesData.IsActive
        const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"

        const botSymbolMissID = `${botID}-${symbol}`

        !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {});
        allStrategiesByCandleAndSymbol[symbol][strategyID] = strategiesData

        !allStrategiesByBotIDAndOrderID[botID] && (allStrategiesByBotIDAndOrderID[botID] = {});
        !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID] && cancelAll({ botID, strategyID });



        if (IsActive) {
            if (!botApiList[botID]) {

                botApiList[botID] = {
                    id: botID,
                    ApiKey,
                    SecretKey,
                    botName,
                    telegramID: strategiesData.botID.telegramID,
                    telegramToken: strategiesData.botID.telegramToken,
                }

                newBotApiList[botID] = {
                    id: botID,
                    ApiKey,
                    SecretKey,
                    botName,
                    telegramID: strategiesData.botID.telegramID,
                    telegramToken: strategiesData.botID.telegramToken,
                }

                // !allStrategiesByBotIDOrderOC[botID] && (allStrategiesByBotIDOrderOC[botID] = {})
                // !allStrategiesByBotIDOrderOC[botID][symbol] && (
                //     allStrategiesByBotIDOrderOC[botID][symbol] = {
                //         totalOC: 0,
                //         logError: false
                //     }
                // )
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


        !listOrderOC[botID] && (listOrderOC[botID] = {});
        !listOrderOC[botID].listOC && (listOrderOC[botID] = {
            listOC: {},
            ApiKey,
            SecretKey,
        });

        allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId && (listOrderOC[botID].listOC[strategyID] = {
            strategyID,
            symbol,
            side,
            botName,
            botID,
            orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId
        });


        if (!strategiesData.IsActive) {

            allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID && listOrderTP.push({
                ...cancelDataObject,
                orderId: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID,
                gongLai: true
            })
            // handleCancelOrderTP({
            //     ...cancelDataObject,
            //     orderId: missTPDataBySymbol[botSymbolMissID]?.orderID,
            //     gongLai: true
            // })

        }

    }))

    const cancelAllOC = cancelAllListOrderOC(listOrderOC)

    const cancelAllTP = handleCancelAllOrderTP({
        items: listOrderTP
    })

    await Promise.allSettled([cancelAllOC, cancelAllTP])

    !botApiData && await handleSocketBotApiList(newBotApiList);
    updatingAllMain = false

});

socketRealtime.on('bot-api', async (data) => {
    const { newData, botID: botIDMain, newApiData } = data;
    updatingAllMain = true

    const botNameExist = botApiList[botIDMain]?.botName || botIDMain

    console.log(`[...] Bot-Api ( ${botNameExist} ) Update Strategies From Realtime`, newData.length);

    const listOrderOC = []
    const listOrderTP = []

    await Promise.allSettled(newData.map((strategiesData, index) => {

        if (checkConditionBot(strategiesData)) {
            const strategyID = strategiesData.value
            const symbol = strategiesData.symbol
            const ApiKey = strategiesData.botID.ApiKey
            const SecretKey = strategiesData.botID.SecretKey
            const botID = strategiesData.botID._id
            const botName = strategiesData.botID.botName
            const side = strategiesData.PositionSide === "Long" ? "Buy" : "Sell"
            const Candlestick = strategiesData.Candlestick.split("")[0]


            const botSymbolMissID = `${botID}-${symbol}`

            !allStrategiesByCandleAndSymbol[symbol] && (allStrategiesByCandleAndSymbol[symbol] = {});
            allStrategiesByCandleAndSymbol[symbol][strategyID] = strategiesData

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

            allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID && listOrderTP.push({
                ...cancelDataObject,
                orderId: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID,
                gongLai: true
            })

            !listOrderOC[botID] && (listOrderOC[botID] = {});
            !listOrderOC[botID].listOC && (listOrderOC[botID] = {
                listOC: {},
                ApiKey,
                SecretKey,
            });

            allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId && (listOrderOC[botID].listOC[strategyID] = {
                strategyID,
                symbol,
                side,
                botName,
                botID,
                orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId
            });
            // handleCancelOrderTP({
            //     ...cancelDataObject,
            //     orderId: missTPDataBySymbol[botSymbolMissID]?.orderID
            //     ,
            //     gongLai: true
            // })

        }
    }))

    const cancelAllOC = cancelAllListOrderOC(listOrderOC)

    const cancelAllTP = handleCancelAllOrderTP({
        items: listOrderTP
    })

    await Promise.allSettled([cancelAllOC, cancelAllTP])

    // 
    try {
        const botApiData = botApiList[botIDMain]
        const ApiKeyBot = botApiData.ApiKey
        const SecretKeyBot = botApiData.SecretKey

        const wsConfigOrder = {
            testnet: false,
            key: ApiKeyBot,
            secret: SecretKeyBot,
            market: 'v5',
            recvWindow: 100000
        }

        const wsOrder = new WebsocketClient(wsConfigOrder);

        await wsOrder.unsubscribeV5(LIST_ORDER, 'spot')

        botApiList[botIDMain] = {
            ...botApiList[botIDMain],
            ApiKey: newApiData.ApiKey,
            SecretKey: newApiData.SecretKey,
        }

        const wsConfigOrderNew = {
            testnet: false,
            key: newApiData.ApiKey,
            secret: newApiData.SecretKey,
            market: 'v5',
            recvWindow: 100000
        }

        const wsOrderNew = new WebsocketClient(wsConfigOrderNew);

        await wsOrderNew.subscribeV5(LIST_ORDER, 'spot')

    } catch (error) {
        console.log("[!] Error subscribeV5", error)
    }

    updatingAllMain = false


});

socketRealtime.on('bot-delete', async (data) => {
    const { newData, botID: botIDMain } = data;
    updatingAllMain = true

    const botNameExist = botApiList[botIDMain]?.botName || botIDMain

    console.log(`[...] Bot Deleted ( ${botNameExist} ) Strategies From Realtime`);

    const listOrderOC = []
    const listOrderTP = []
    const botApiData = botApiList[botIDMain]

    await Promise.allSettled(newData.map(async (strategiesData, index) => {
        if (checkConditionBot(strategiesData)) {

            const ApiKey = strategiesData.botID.ApiKey
            const SecretKey = strategiesData.botID.SecretKey

            const symbol = strategiesData.symbol
            const strategyID = strategiesData.value
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

            !allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID && listOrderTP.push({
                ...cancelDataObject,
                orderId: allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]?.TP?.orderID,
                gongLai: true
            })

            !listOrderOC[botID] && (listOrderOC[botID] = {});
            !listOrderOC[botID].listOC && (listOrderOC[botID] = {
                listOC: {},
                ApiKey,
                SecretKey,
            });

            allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId && (listOrderOC[botID].listOC[strategyID] = {
                strategyID,
                symbol,
                side,
                botName,
                botID,
                orderLinkId: allStrategiesByBotIDAndStrategiesID?.[botID]?.[strategyID]?.OC?.orderLinkId
            });
            // handleCancelOrderTP({
            //     ...cancelDataObject,
            //     orderId: missTPDataBySymbol[botSymbolMissID]?.orderID,
            //     gongLai: true
            // })

            delete allStrategiesByBotIDAndStrategiesID[botID]?.[strategyID]
            delete allStrategiesByCandleAndSymbol[symbol]?.[strategyID]
        }
    }))

    const cancelAllOC = cancelAllListOrderOC(listOrderOC)

    const cancelAllTP = handleCancelAllOrderTP({
        items: listOrderTP
    })

    await Promise.allSettled([cancelAllOC, cancelAllTP])


    const ApiKeyBot = botApiData.ApiKey
    const SecretKeyBot = botApiData.SecretKey

    const wsConfigOrder = {
        testnet: false,
        key: ApiKeyBot,
        secret: SecretKeyBot,
        market: 'v5',
        recvWindow: 100000
    }

    const wsOrder = new WebsocketClient(wsConfigOrder);

    await wsOrder.unsubscribeV5(LIST_ORDER, 'spot')

    delete botApiList[botIDMain]
    updatingAllMain = false

});

socketRealtime.on('bot-telegram', async (data) => {

    const { botID: botIDMain, newApiData } = data;

    const botNameExist = botApiList[botIDMain]?.botName || botIDMain

    console.log(`[...] Bot Telegram ( ${botNameExist} ) Update From Realtime`);

    botApiList[botIDMain] = {
        ...botApiList[botIDMain],
        telegramID: newApiData.telegramID,
        telegramToken: newApiData.telegramToken
    }

});

socketRealtime.on('sync-symbol', async (newData) => {
    console.log("[...] Sync Symbol");

    allSymbol = allSymbol.concat(newData)

    const newListKline = newData.map(symbol => {
        trichMauOCListObject[symbol.value] = {
            preTime: 0,
        }
        return `kline.1.${symbol}`
    })

    const resultDigitAll = await Digit()
    resultDigitAll?.length > 0 && (
        resultDigitAll.reduce((pre, cur) => {
            if (cur.symbol.includes("USDT")) {
                pre[cur.symbol] = {
                    priceScale: cur.priceScale,
                    minOrderQty: +cur.minOrderQty,
                    maxOrderQty: +cur.maxOrderQty,
                }
            }
            return pre
        }, digitAllCoinObject)
    );


    await handleSocketListKline(newListKline)

});

// socketRealtime.on("close-limit", async (data) => {
//     const { positionData, newOrderID } = data

//     const symbol = positionData.Symbol
//     const botName = positionData.BotName
//     const botID = positionData.botID
//     console.log(`[...] Close Limit ( ${botName} - ${symbol} )`);

//     const botSymbolMissID = `${botID}-${symbol}`

//     const listMiss = missTPDataBySymbol[botSymbolMissID]?.orderIDOfListTP

//     listMiss?.length > 0 && await Promise.allSettled(listMiss.map((orderIdTPData) => {
//         handleCancelOrderTP({
//             ApiKey: positionData.botData.ApiKey,
//             SecretKey: positionData.botData.SecretKey,
//             strategyID: orderIdTPData?.strategyID,
//             symbol,
//             side: positionData.Side,
//             orderId: orderIdTPData?.orderID,
//             botID,
//             botName
//         })
//     }))
//     !missTPDataBySymbol[botSymbolMissID] && resetMissData({ botID, symbol })

//     missTPDataBySymbol[botSymbolMissID]?.timeOutFunc && clearTimeout(missTPDataBySymbol[botSymbolMissID].timeOutFunc)

//     missTPDataBySymbol[botSymbolMissID].orderIDOfListTP = []

//     missTPDataBySymbol[botSymbolMissID].orderIDOfListTP.push({
//         orderID: newOrderID,
//     })
//     missTPDataBySymbol[botSymbolMissID].size = Math.abs(positionData.Quantity)

// })

socketRealtime.on('close-upcode', async () => {

    console.log(`[...] Close All Bot For Upcode`);

    updatingAllMain = true

    await cancelAllListOrderOC(listOCByCandleBot)

    console.log("PM2 Kill Successful");
    exec("pm2 stop runTrade-dev-beta")

});

socketRealtime.on('disconnect', () => {
    console.log('[V] Disconnected from socket realtime');
});

