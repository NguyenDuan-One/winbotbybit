const TelegramBot = require('node-telegram-bot-api');

setInterval(()=>{
    const bot = new TelegramBot("7430422460:AAHWBefQH7clQPt8AbCfZuuqlpJ2fsP7Tt8", {polling: true});
const message = "thanh"
bot.sendMessage("-1002172712827", message,{
    parse_mode:"HTML"
}).then(data=>{
    console.log("send successful");
}).catch(err=>{
    console.log("Error:",err);
})

},1000)