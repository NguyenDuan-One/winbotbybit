require('dotenv').config();
const { exec } = require('child_process');

const TelegramBot = require('node-telegram-bot-api');

const { RestClientV5, WebsocketClient } = require('bybit-api');
var cron = require('node-cron');

const bot = new TelegramBot("6992407921:AAFS2wimsauyuoj1eXJFN_XxRFhs5wWtp7c", {
    polling: false,
    request: {
        agentOptions: {
            family: 4
        }
    }
});
const CHANNEL_ID = "-1002178225625"
const MAX_ORDER_LIMIT = 20

var sendTeleCount = {
    logError: false,
    total: 0
}
let digit = []
let OpenTimem1 = []
let CoinFT = []
let messageList = []

var delayTimeOut = ""
var coinAllClose = false
var trichMauData = {}
var trichMau = {}
var symbolObject = {}
var listKline = []
var trichMauTimeMainSendTele = {
    pre: 0,
    cur: 0
}

let botListTelegram = {}

let wsConfig = {
    market: 'v5',
    recvWindow: 100000
}
let wsSymbol = new WebsocketClient(wsConfig);
let wsInfo = {
    testnet: false,
}
let CoinInfo = new RestClientV5(wsInfo);

//Funcition

async function sendMessageWithRetry(messageText, retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            messageText && await bot.sendMessage(CHANNEL_ID, messageText, {
                parse_mode: "HTML",
            });
            console.log('[->] Message sent to telegram successfully');
            return;
        } catch (error) {
            if (error.code === 429) {
                const retryAfter = error.parameters.retry_after;
                console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            } else {
                console.log("[!] Send Telegram Error", error)
            }
        }
    }
    throw new Error('Failed to send message after multiple retries');

}



async function ListCoinFT() {

    let ListCoin1m = []

    await CoinInfo.getInstrumentsInfo({ category: 'spot' })
        .then((rescoin) => {
            rescoin.result.list.forEach((e) => {
                const symbol = e.symbol
                if (symbol.split("USDT")[1] === "") {
                    ListCoin1m.push(`kline.1.${symbol}`)
                }

                symbolObject[symbol] = e.marginTrading != "none" ? "🍁" : "🍀"
                trichMauData[symbol] = {
                    open: 0,
                    close: 0,
                    high: 0,
                    low: 0,
                    turnover: 0
                }
                trichMau[symbol] = {
                    cur: 0,
                    pre: 0,
                }
            })
        })
        .catch((error) => {
            console.error(error);
        });


    return ListCoin1m
}



const roundNumber = (number) => {
    return Math.round(number * 10000) / 100
}

const formatNumberString = number => {
    if (number >= 1000000000) {
        return (number / 1000000000).toFixed(2) + 'B';
    } else if (number >= 1000000) {
        return (number / 1000000).toFixed(2) + 'M';
    } else if (number >= 1000) {
        return (number / 1000).toFixed(2) + 'K';
    } else {
        return number.toString();
    }
}

const sendMessageTinhOC = async (messageList) => {
    console.log(`Send telegram tính OC ( 🍁 ): `, new Date().toLocaleString("vi-vn", { timeZone: 'Asia/Ho_Chi_Minh' }));
    await sendMessageWithRetry(messageList.join("\n\n"))

}


const tinhOC = (symbol, data) => {

    const Close = +data.close
    const Open = +data.open
    const Highest = +data.high
    const Lowest = +data.low


    const vol = data.turnover

    let OC = ((Highest - Open) / Open) || 0
    let TP = ((Highest - Close) / (Highest - Open)) || 0

    let OCLong = (Lowest - Open) / Lowest || 0
    let TPLong = (Lowest - Close) / (Open - Lowest) || 0

    if (OC == "Infinity") {
        OC = 0
    }
    if (TP == "Infinity") {
        TP = 0
    }
    if (OCLong == "Infinity") {
        OCLong = 0
    }
    if (TPLong == "Infinity") {
        TPLong = 0
    }

    //console.log(OC);
    //console.log(TP);

    //if (OC < Math.abs(OC1)) { OC = OC1 }
    //if (Close < Open) { TP = TP1 }

    //console.log(`${symbol} : Price Close ${Close}, Price OC ${OC}`)\

    const OCRound = roundNumber(OC)
    const TPRound = roundNumber(TP)
    const OCLongRound = roundNumber(OCLong)
    const TPLongRound = roundNumber(TPLong)

    // if (OCRound >= 1 && TPRound > 0) {
    if (OCRound >= .5) {
        const ht = (`${symbolObject[symbol]} | <b>${symbol.replace("USDT", "")}</b> - OC: ${OCRound}% - TP: ${roundNumber(TP)}% - VOL: ${formatNumberString(vol)}`)
        messageList.push(ht)
        console.log("data", data, new Date().toLocaleTimeString());
        console.log(ht);
        if (TPRound < 0) {
            console.log("data", data, new Date().toLocaleTimeString());
            console.log(ht);
            process.exit(0)
        }
    }
    // if (OCLongRound <= -1 && TPLongRound < 0) {
    if (OCLongRound <= -.5) {
        const htLong = (`${symbolObject[symbol]} | <b>${symbol.replace("USDT", "")}</b> - OC: ${OCLongRound}% - TP: ${roundNumber(TPLong)}% - VOL: ${formatNumberString(vol)}`)
        messageList.push(htLong)
        console.log("data", data, new Date().toLocaleTimeString());
        console.log(htLong);
        if (TPLongRound < 0) {
            console.log("data", data, new Date().toLocaleTimeString());
            console.log(htLong);
            process.exit(0)
        }
    }



    if (messageList.length > 0) {
        trichMauTimeMainSendTele.cur = new Date()
        if (trichMauTimeMainSendTele.cur - trichMauTimeMainSendTele.pre >= 3000) {
            sendTeleCount.total += 1

            // sendMessageTinhOC(messageList)
            messageList = []
            trichMauTimeMainSendTele.pre = new Date()
        }
    }
    // if (sendTeleCount.total < MAX_ORDER_LIMIT) {
    // }
    // else {
    //     if (!sendTeleCount?.logError) {
    //         console.log(`[!] LIMIT SEND TELEGRAM`);
    //         sendTeleCount.logError = true
    //         setTimeout(() => {
    //             sendTeleCount.logError = false
    //             sendTeleCount.total = 0
    //         }, 3000)
    //     }
    // }
}


let Main = async () => {


    listKline = await ListCoinFT()

    wsSymbol.subscribeV5(listKline, 'spot').then(() => {
        console.log("[V] Subscribe Kline Successful");

        wsSymbol.on('update', async (dataCoin) => {

            const dataMainAll = dataCoin.data

            dataMainAll.forEach(dataMain => {
                const coinCurrent = +dataMain.close
                const turnover = +dataMain.turnover
                const [_, candle, symbol] = dataCoin.topic.split(".");

                // if (symbol === "CRDSUSDT") {
                //     console.log("\n", dataCoin, new Date().toLocaleTimeString(), "\n");
                // }

                if (coinAllClose) {

                    if (coinCurrent > trichMauData[symbol].high) {
                        trichMauData[symbol].high = coinCurrent

                    }
                    if (coinCurrent < trichMauData[symbol].low) {
                        trichMauData[symbol].low = coinCurrent
                    }

                    trichMauData[symbol].turnover = turnover - trichMauData[symbol].turnover
                    trichMauData[symbol].turnoverD = turnover
                    trichMauData[symbol].close = coinCurrent

                    if (new Date() - trichMau[symbol].pre >= 3000) {

                        trichMau[symbol].pre = new Date()
                        tinhOC(symbol, trichMauData[symbol])
                        trichMauData[symbol].open = coinCurrent
                        trichMauData[symbol].turnover = turnover
                    }
                    trichMauData[symbol] = {
                        high: coinCurrent,
                        low: coinCurrent,
                    }

                }
                else if (dataMain.confirm === true) {
                    coinAllClose = true
                    trichMau[symbol].pre = new Date()
                    trichMauData[symbol] = {
                        open: coinCurrent,
                        high: coinCurrent,
                        low: coinCurrent,
                        turnover: turnover,
                    }
                }
            })


        });
    }).catch((err) => { console.log(err) });





    //Báo lỗi socket$ pm2 start app.js
    wsSymbol.on('error', (err) => {
        process.exit(1);
    });

};

try {
    Main()


    setTimeout(() => {
        cron.schedule('0 */3 * * *', async () => {
            process.exit(0);
        });
    }, 1000)
}

catch (e) {
    console.log("Error Main:", e)
}