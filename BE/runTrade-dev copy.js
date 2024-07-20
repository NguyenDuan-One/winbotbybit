const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot("7430422460:AAHWBefQH7clQPt8AbCfZuuqlpJ2fsP7Tt8", { polling: true });

const priceWin = "2.56"
const priceWinPercent = "6.89"
let message = `🚀 <b>${"fgfg"} ( OC: ${"20"}% ):</b>\n`
const textWinLose = `\n✅ [WIN - Buy]: ${priceWin} | ${priceWinPercent}%\n`
bot.sendMessage("-1002172712827", message, {
    parse_mode: "HTML"
}).then(data => {
    console.log("send successful");
}).catch(err => {
    console.log("Error:");
})
