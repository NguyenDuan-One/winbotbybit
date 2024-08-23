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
const MAX_ORDER_LIMIT = 10

var sendTeleCount = {
    logError: false,
    total: 0
}
let digit = []
let OpenTimem1 = []
let CoinFT = []
let messageList = []
let delayTimeOut = ""

var coinAllClose = false
var trichMauData = {}
var symbolObject = {}

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
            })
        })
        .catch((error) => {
            console.error(error);
        });


    return ListCoin1m
}

async function TimeS0(symbol) { //lấy thời gian mở cửa của cây nến 1m
    let TimeStart = []
    await CoinInfo.getKline({
        category: 'spot',
        symbol: symbol,
        interval: '1',
    })
        .then((response) => {
            TimeStart.push(response.result.list[0][0])
            //console.log(TimeStart)
        })
        .catch((error) => {
            console.error(error);
        });
    return TimeStart
}

async function Digit(symbol) {// proScale
    let PScale = []
    await CoinInfo.getInstrumentsInfo({
        category: 'spot',
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

const handleIconCandle = (candle) => {
    switch (candle) {
        case "1": {
            return "🟠"
        }
        case "3": {
            return "🟡"
        }
        case "5": {
            return "🟢"
        }
        case "15": {
            return "🟣"
        }
    }
}

const tinhOC = (symbol, data) => {

    const Close = +data.close
    const Open = +data.open
    const Highest = +data.high
    const Lowest = +data.low

    // console.log("Close",Close);
    // console.log("Open",Open);
    // console.log("Lowest",Lowest);
    // console.log("Highest",Highest);

    // const vol = data.volume * data.open

    const vol = data.turnover

    let OC = ((Highest - Open) / Open) || 0
    let TP = ((Highest - Close) / (Highest - Open)) || 0

    let OCLong = (Lowest - Open) / Lowest || 0
    let TPLong = (Close - Lowest) / (Open - Lowest) || 0

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
    const OCLongRound = roundNumber(OCLong)

    if (OCRound > 8 || OCLongRound > 8) {
        console.log("OC", OC);
        console.log("OCRound", OCRound);
        console.log("OCLong", OCLong);
        console.log("OCLongRound", OCLongRound);

    }
    if (Math.abs(OCRound) > 1) {
        const ht = (`${symbolObject[symbol]} | <b>${symbol.replace("USDT", "")}</b> - OC: ${OCRound}% - TP: ${roundNumber(TP)}% - VOL: ${formatNumberString(vol)}`)
        messageList.push(ht)

    }
    if (Math.abs(OCLongRound) > 1) {
        const htLong = (`${symbolObject[symbol]} | <b>${symbol.replace("USDT", "")}</b> - OC: ${OCLongRound}% - TP: ${roundNumber(TPLong)}% - VOL: ${formatNumberString(vol)}`)
        messageList.push(htLong)
    }
    if (sendTeleCount.total < MAX_ORDER_LIMIT) {
        sendTeleCount.total += 1
        sendMessageTinhOC()
    }
    else {

        if (sendTeleCount?.logError) {
            console.log(changeColorConsole.redBright(`[!] LIMIT SEND TELEGRAM`));
            sendTeleCount.logError = true
            setTimeout(() => {
                sendTeleCount.logError = false
                sendTeleCount.total = 0
            }, 1000)
        }
    }
}

async function history(symbol, OpenTime, limit = 10, dg, percentDefault = 1, coinListWin50 = []) {
    let TimeStart = OpenTime - limit * 60000
    let TimeSop = OpenTime - 60000
    let data = []
    //console.log(`BTCUSDT Open m1 : ${TimeStart}`)

    CoinInfo.getMarkPriceKline({
        category: 'spot',
        symbol,
        interval: "1",
        start: TimeStart,
        end: TimeSop,
        limit,
    })
        .then((response) => {
            const candles = [];

            //console.log(response.result.list)
            for (let i = 0; i < limit; i++) {
                //console.log(response.result.list[i][1])
                candles.push({
                    open: response.result.list[i][1],
                    high: response.result.list[i][2],
                    low: response.result.list[i][3],
                    close: response.result.list[i][4]
                });
            }
            // console.log(`open0`, response.result.list[0][1])

            let winCountShort = 0
            let winCountLong = 0
            let totalShort = limit
            let totalLong = limit

            const OCDownPercent = 40 / 100
            const TPDownPercent2 = 45


            for (let i = candles.length - 1; i >= 0; i--) {
                const OCDefault = candles[i].open * (100 + percentDefault) / 100
                const TPTemp = candles[i].open * (100 + 1 - OCDownPercent) / 100
                const closeTemp = candles[i].close
                if (OCDefault <= candles[i].high) {
                    if (closeTemp > TPTemp) {
                        if (candles[i - 1]?.open) {
                            const hieu = Math.abs((candles[i - 1].open - TPTemp) * TPDownPercent2 / 100)
                            const TPNew = TPTemp + hieu
                            if (TPNew <= OCDefault) {
                                if (candles[i - 1].low <= TPNew) {
                                    winCountShort++
                                }
                                else {
                                    if (candles[i - 2]?.open) {
                                        const hieu = Math.abs((candles[i - 2].open - TPTemp) * TPDownPercent2 / 100)
                                        const TPNew = TPTemp + hieu
                                        if (TPNew <= OCDefault) {
                                            if (candles[i - 2].low <= TPNew) {
                                                winCountShort++
                                            }
                                            else {
                                                if (candles[i - 3]?.open) {
                                                    const hieu = Math.abs((candles[i - 3].open - TPTemp) * TPDownPercent2 / 100)
                                                    const TPNew = TPTemp + hieu
                                                    if (TPNew <= OCDefault) {
                                                        if (candles[i - 3].low <= TPNew) {
                                                            winCountShort++
                                                        }
                                                        else {
                                                        }
                                                    }
                                                    else {
                                                    }
                                                }
                                                else {
                                                }
                                            }
                                        }
                                        else {
                                        }
                                    }
                                    else {
                                    }
                                }
                            }
                            else {
                            }
                        }
                        else {
                        }
                    }
                    else {
                        winCountShort++
                    }
                }
                else {
                    totalShort--
                }

            }

            for (let i = candles.length - 1; i >= 0; i--) {
                const OCDefault = candles[i].open * (100 - percentDefault) / 100
                const TPTemp = candles[i].open * (100 - (1 - OCDownPercent)) / 100
                const closeTemp = candles[i].close
                if (OCDefault >= candles[i].low) {
                    if (closeTemp < TPTemp) {
                        if (candles[i - 1]?.open) {
                            const hieu = Math.abs((candles[i - 1].open - TPTemp) * TPDownPercent2 / 100)
                            const TPNew = TPTemp - hieu
                            if (TPNew >= OCDefault) {
                                if (candles[i - 1].high >= TPNew) {
                                    winCountLong++
                                }
                                else {
                                    if (candles[i - 2]?.open) {
                                        const hieu = Math.abs((candles[i - 2].open - TPTemp) * TPDownPercent2 / 100)
                                        const TPNew = TPTemp - hieu
                                        if (TPNew >= OCDefault) {
                                            if (candles[i - 2].high >= TPNew) {

                                                winCountLong++
                                            }
                                            else {
                                                if (candles[i - 3]?.open) {
                                                    const hieu = Math.abs((candles[i - 3].open - TPTemp) * TPDownPercent2 / 100)
                                                    const TPNew = TPTemp - hieu
                                                    if (TPNew >= OCDefault) {
                                                        if (candles[i - 3].high >= TPNew) {

                                                            winCountLong++
                                                        }
                                                        else {
                                                        }
                                                    }
                                                    else {
                                                    }
                                                }
                                                else {
                                                }
                                            }
                                        }
                                        else {
                                        }
                                    }
                                    else {
                                    }
                                }
                            }
                            else {
                            }
                        }
                        else {
                        }
                    }
                    else {
                        winCountLong++
                    }
                }
                else {
                    totalLong--
                }

            }

            const shortPercent = (winCountShort / totalShort * 100).toFixed(3)
            const longPercent = (winCountLong / totalLong * 100).toFixed(3)

            const winShort = winCountShort && totalShort ? `${winCountShort} / ${totalShort}` : 0
            const winLong = winCountLong && totalLong ? `${winCountLong} / ${totalLong}` : 0


            // if (shortPercent > 80 && longPercent > 80) {
            //     let messageText = `${symbol} ( OC: ${percentDefault}% ):\n`
            //     if (shortPercent > 80) {

            //         messageText += `Short: ${winShort} - `
            //     }
            //     if (longPercent > 80) {
            //         messageText += `Long: ${winLong} - `
            //     }
            //     console.log(messageText);
            //     coinListWin50.push(messageText.slice(0, -2))
            //     // bot.telegram.sendMessage(CHANNEL_ID, messageText.slice(0, -2));
            // }
            const percentDefaultWin = 80
            if (shortPercent > percentDefaultWin || longPercent > percentDefaultWin) {
                let messageText = `🌎 <b>${symbol.replace("USDT", "")} ( OC: ${percentDefault}% ):</b>\n`
                let messageTextItem = ``
                if (shortPercent > percentDefaultWin) {

                    messageTextItem += `Short: ${winShort} - `
                }
                if (longPercent > percentDefaultWin) {
                    messageTextItem += `Long: ${winLong} - `
                }
                console.log(messageText + messageTextItem);
                coinListWin50.push(`${messageText}<i>${messageTextItem.slice(0, -2)}</i>`)
            }
            // else{
            //     console.log("Not Coin Win > 80%");
            // }

        })
        .catch((error) => {
            console.error(error);
        });
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processCoin(coinItem, coinListWin50, percentDefault, nenCount) {
    const OpenTimem1 = TimeS0("BTCUSDT");
    const digit = Digit(coinItem);
    await Promise.all([OpenTimem1, digit])
    await history(coinItem, OpenTimem1, nenCount, digit, percentDefault, coinListWin50);
}

async function processCoinsWithDelay(coinList, delayTime, percentDefault, nenCount) {
    const coinListWin50 = []
    for (const index in coinList) {
        await processCoin(coinList[index], coinListWin50, percentDefault, nenCount);
        index % 50 == 0 && await delay(delayTime);
    }
    return coinListWin50
}


const handleStatistic = async (statisticLabel) => {


    const delayTime = 10;
    const percentDefault2 = 2
    const percentDefault25 = 2.5
    const percentDefault3 = 3
    const percentDefault35 = 3.5
    // Số cây nến
    const nenCount = 100;

    console.log(statisticLabel, new Date().toLocaleString("vi-vn"));

    const get2 = await processCoinsWithDelay(CoinFT, delayTime, percentDefault2, nenCount)
    sendMessageWithRetry(get2.join("\n"))
    await delay(1000)

    const get25 = await processCoinsWithDelay(CoinFT, delayTime, percentDefault25, nenCount)
    sendMessageWithRetry(get25.join("\n"))
    await delay(1000)

    const get3 = await processCoinsWithDelay(CoinFT, delayTime, percentDefault3, nenCount)
    sendMessageWithRetry(get3.join("\n"))
    await delay(1000)

    const get35 = await processCoinsWithDelay(CoinFT, delayTime, percentDefault35, nenCount)
    sendMessageWithRetry(get35.join("\n"))
    await delay(1000)
}

const sendMessageTinhOC = async () => {
    if (messageList.length) {
        console.log(`Send telegram tính OC: `, new Date().toLocaleString("vi-vn", { timeZone: 'Asia/Ho_Chi_Minh' }));
        await sendMessageWithRetry(messageList.join("\n\n"))
        messageList = []
    }
    delayTimeOut = false

}

let Main = async () => {

    const trichMau = {
        pre: 0,
        cur: 0
    }


    const listKline = await ListCoinFT()

    wsSymbol.subscribeV5(listKline, 'spot').then(() => {
        console.log("[V] Subscribe Kline Successful");

    }).catch((err) => { console.log(err) });

    let statistic1 = false

    let statistic3 = false

    let statistic5 = false

    const statisticTimeLoop1 = [
        {
            hour: 6,
            minute: 0
        },
        {
            hour: 15,
            minute: 0
        },
        {
            hour: 22,
            minute: 0
        },
    ]
    const statisticTimeLoop3 = [
        {
            hour: 6,
            minute: 5
        },
        {
            hour: 15,
            minute: 5
        },
        {
            hour: 22,
            minute: 5
        },
    ]
    const statisticTimeLoop5 = [
        {
            hour: 6,
            minute: 10
        },
        {
            hour: 15,
            minute: 10
        },
        {
            hour: 22,
            minute: 10
        },
    ]


    wsSymbol.on('update', async (dataCoin) => {
        if (dataCoin.wsKey === "v5SpotPublic") {

            const dataMain = dataCoin.data[0]
            if (coinAllClose) {

                const symbol = dataCoin.topic.split(".").slice(-1)[0]

                const coinCurrent = +dataMain.close
                const turnover = +dataMain.turnover

                !trichMauData[symbol].open && (
                    trichMauData[symbol] = {
                        open: coinCurrent,
                        close: coinCurrent,
                        high: coinCurrent,
                        low: coinCurrent,
                        turnover: turnover,
                    }
                )

                if (coinCurrent > trichMauData[symbol].high) {
                    trichMauData[symbol].high = coinCurrent
                }
                else if (coinCurrent < trichMauData[symbol].low) {
                    trichMauData[symbol].low = coinCurrent
                }

                trichMauData[symbol].close = coinCurrent

                trichMau.cur = new Date()
                if (trichMau.cur - trichMau.pre >= 1000) {
                    trichMauData[symbol].turnover = turnover - trichMauData[symbol].turnover
                    tinhOC(symbol, trichMauData[symbol])
                    trichMauData[symbol] = {
                        open: coinCurrent,
                        close: coinCurrent,
                        high: coinCurrent,
                        low: coinCurrent,
                        turnover: turnover,
                    }
                    trichMau.pre = new Date()
                }
            }
            if (dataMain.confirm === true) {
                coinAllClose = true
            }

            // if (dataCoin.topic.indexOf("kline.1.BTCUSDT") != -1) {
            //     if (dataCoin.data[0].confirm == true) {
            //         console.log("Trade 1 Closed: ", new Date().toLocaleString("vi-vn"));
            //         !statistic1 && statisticTimeLoop1.map(item => {
            //             cron.schedule(`0 ${item.minute} ${item.hour} * * *`, () => {
            //                 handleStatistic("Statistic 1...")
            //             });
            //         })
            //         statistic1 = true
            //     }
            // }

            // if (dataCoin.topic.indexOf("kline.3.BTCUSDT") != -1) {
            //     if (dataCoin.data[0].confirm == true) {
            //         console.log("Trade 3 Closed: ", new Date().toLocaleString("vi-vn"));
            //         !statistic3 && statisticTimeLoop3.map(item => {
            //             cron.schedule(`0 ${item.minute} ${item.hour} * * *`, () => {
            //                 handleStatistic("Statistic 3...")
            //             });
            //         })
            //         statistic3 = true
            //     }
            // }


            // if (dataCoin.topic.indexOf("kline.5.BTCUSDT") != -1) {
            //     if (dataCoin.data[0].confirm == true) {
            //         console.log("Trade 5 Closed: ", new Date().toLocaleString("vi-vn"));
            //         !statistic5 && statisticTimeLoop5.map(item => {
            //             cron.schedule(`0 ${item.minute} ${item.hour} * * *`, () => {
            //                 handleStatistic("Statistic 5...")
            //             });
            //         })
            //         statistic5 = true
            //     }
            // }


        }

    });


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