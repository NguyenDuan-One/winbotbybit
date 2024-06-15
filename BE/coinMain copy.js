require('dotenv').config();
const { Telegraf } = require('telegraf');
const { RestClientV5, WebsocketClient } = require('bybit-api');
const API_KEY = 'foRfrB7L1GgXt1Ly5O';
const PRIVATE_KEY = 'zxbzLknpNW0k1i2Ze8UFtQq2HEK4tgVqFjgp';

const bot = new Telegraf(process.env.BOT_TOKEN);
const CHANNEL_ID = process.env.CHANNEL_ID

// Bắt đầu bot
bot.launch();



let ListCoin1m = [], digit = []
let OpenTimem1 = []

let wsConfig = {
    key: API_KEY,
    secret: PRIVATE_KEY,
    market: 'v5'
}
let wsInfo = {
    key: API_KEY,
    secret: PRIVATE_KEY,
    testnet: false,
    enable_time_sync: true,
    timestamp: new Date().toISOString(),
    recvWindow: 200000,
}
let wsSymbol = new WebsocketClient(wsConfig);
let CoinInfo = new RestClientV5(wsInfo);

//Funcition
async function ListCoinFT() {
    let data = []
    await CoinInfo.getTickers({ category: 'linear' })
        .then((rescoin) => {
            rescoin.result.list.forEach((e) => {
                if (e.symbol.indexOf("USDT") > 0) {
                    data.push(e.symbol)
                }
            })
            //console.log(data)
        })
        .catch((error) => {
            console.error(error);
        });
    ListCoin1m = data.flatMap((coin) => {
        return `kline.1.${coin}`
    });

    return data
}

async function TimeS0(symbol) { //lấy thời gian mở cửa của cây nến 1m
    let TimeStart = []
    await CoinInfo.getKline({
        category: 'linear',
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

async function tinhOC(symbol, data, messageList) {



    const interval = data.interval
    const Close = data.close
    const Open = data.open
    const Highest = data.high
    const Lowest = data.low

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

    //console.log(`${symbol} : Price Close ${Close}, Price OC ${OC}`)
    const OCRound = roundNumber(OC)
    const OCLongRound = roundNumber(OCLong)

    if (OCRound > 1) {
        const ht = (`${symbol.replace("USDT", "")} - (${interval} min) - OC: ${OCRound}% - TP: ${roundNumber(TP)}% - VOL: ${formatNumberString(vol)}`)
        messageList.push(ht)

    }
    if (OCLongRound > 1) {
        const htLong = (`${symbol.replace("USDT", "")} - (${interval} min) - OC: ${OCLongRound}% - TP: ${roundNumber(TPLong)}% - VOL: ${formatNumberString(vol)}`)
        messageList.push(htLong)
    }
    return messageList
}

async function history(symbol, OpenTime, limit = 10, dg, percentDefault = 1) {
    let TimeStart = OpenTime - limit * 60000
    let TimeSop = OpenTime - 60000
    let data = []
    //console.log(`BTCUSDT Open m1 : ${TimeStart}`)

    CoinInfo.getMarkPriceKline({
        category: 'linear',
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

            console.log(candles)

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
                                                if (candles[i - 3].open) {
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

            console.log("winCountShort",winCountShort);
            console.log("winCountLong",winCountLong);
            console.log("totalShort",totalShort);
            console.log("totalLong",totalLong);

            // console.log(`\nTỷ lệ WIN-SHORT ( ${percentDefault}% ): ${winCountShort && totalShort ? Math.toFixed(winCountShort / totalShort * 100, 3) : 0} %`);
            // console.log(`Tỷ lệ WIN-LONG ( ${percentDefault}% ): ${winCountLong && totalLong? Math.toFixed(winCountLong / totalLong * 100, 3) : 0} %`);


        })
        .catch((error) => {
            console.error(error);
        });
}


let Main = async () => {
    CoinFT = await ListCoinFT()

    //sub allcoin
    wsSymbol.subscribeV5(ListCoin1m, 'linear').catch((err) => { console.log(err) });

    //nếu thay đổi thì sẽ update dữ liệu
    wsSymbol.on('update', async (dataCoin) => {
        const messageList = []
        if (dataCoin.wsKey === "v5LinearPublic") {

            if (dataCoin.topic.indexOf("kline.1.BTCUSDT") != -1) {
                if (dataCoin.data[0].confirm == true) {
                    //OpenTimem1 = dataCoin.data[0].start
                    const coinName = "RPLUSDT"
                    const nenCount = 50
                    OpenTimem1 = await TimeS0("BTCUSDT")
                    digit = await Digit(coinName)
                    history(coinName, OpenTimem1, nenCount, digit, 1)

                }
            }

            // if (dataCoin.topic.indexOf("kline.1.") !== -1) {
            //     let symbol = dataCoin.topic.replace("kline.1.", "")
            //     if (dataCoin.data[0].confirm === true) {
            //         dataCoin.data.forEach((e) => {
            //             tinhOC(symbol, e, messageList)
            //         })
            //     }
            // }
            // if (dataCoin.topic.indexOf("kline.3.") !== -1) {
            //     let symbol = dataCoin.topic.replace("kline.3.", "")
            //     if (dataCoin.data[0].confirm === true) {
            //         dataCoin.data.forEach((e) => {
            //             tinhOC(symbol, e, messageList)
            //         })
            //     }
            // }
            // if (dataCoin.topic.indexOf("kline.5.") !== -1) {
            //     let symbol = dataCoin.topic.replace("kline.5.", "")
            //     if (dataCoin.data[0].confirm === true) {
            //         dataCoin.data.forEach((e) => {
            //             tinhOC(symbol, e, messageList)
            //         })
            //     }
            // }
        }
        messageList.length && sendMessageWithRetry(messageList.join("\n"))

    });



    //Báo lỗi socket
    wsSymbol.on('error', (err) => {
        console.error('error', err);
    });

};

async function sendMessageWithRetry(messageText, retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            await bot.telegram.sendMessage(CHANNEL_ID, messageText);
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


// const sendMessageToChannel = async (messageText) => {

//     try {
//         await bot.telegram.sendMessage(CHANNEL_ID, messageText);
//         console.log('Send message to channel successful');
//     } catch (error) {
//         await bot.telegram.sendMessage(CHANNEL_ID, `ERROR: ${error}`);
//     }

// }


Main()