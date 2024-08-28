require('dotenv').config();
const { exec } = require('child_process');

const TelegramBot = require('node-telegram-bot-api');

const { RestClientV5, WebsocketClient } = require('bybit-api');
var cron = require('node-cron');

const bot = new TelegramBot(process.env.BOT_TOKEN_THONG_KE, {
    polling: false,
    request: {
        agentOptions: {
            family: 4
        }
    }
});
const CHANNEL_ID = process.env.CHANNEL_ID_THONG_KE


let listKline = []
let digit = []
let OpenTimem1 = []
let CoinFT = []
let messageList = []
let delayTimeOut = ""

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
async function history(symbol, OpenTime, limit = 10, dg, percentDefault = 1, coinListWin50 = []) {
    let TimeStart = 1724833680000 + 54 * 1000
    let TimeSop = TimeStart + 1000
    let data = []
    //console.log(`BTCUSDT Open m1 : ${TimeStart}`)

    CoinInfo.getKline({
        category: 'spot',
        symbol: "CRDSUSDT",
        interval: "1",
        start: TimeStart,
        end: TimeSop,
        limit
    })
        .then((response) => {
            console.log(response.result.list);
        })
        .catch((error) => {
            console.error(error);
        });
}
history()