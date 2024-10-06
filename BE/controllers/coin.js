const { RestClientV5, WebsocketClient } = require('bybit-api');
const CoinModel = require('../models/coin.model');

const CoinController = {

    getSymbolFromCloud: async (userID) => {
        try {

            let ListCoin1m = []

            let wsConfig = {
                market: 'v5',
                recvWindow: 100000

            }
            let wsInfo = {
                testnet: false,
            }
            let wsSymbol = new WebsocketClient(wsConfig);
            let CoinInfo = new RestClientV5(wsInfo);

            let data = []
            await CoinInfo.getTickers({ category: 'linear' })
                .then((rescoin) => {
                    rescoin.result.list.forEach((e) => {
                        if (e.symbol.indexOf("USDT") > 0) {
                            data.push({
                                symbol: e.symbol,
                                volume24h: e.turnover24h,
                            })
                        }
                    })
                })
                .catch((error) => {
                    console.error(error);
                });
            ListCoin1m = data.flatMap((coin) => {
                return `kline.1.${coin}`
            });

            return data

        } catch (err) {
            return []
        }
    },
    getAllCoin: async (req, res) => {
        try {
            const data = await CoinModel.find()

            res.customResponse(200, "Get All Coin Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    syncCoin: async (req, res) => {
        try {
            const resData = await CoinController.getSymbolFromCloud()

            const bulkOperations = resData.map(data => ({
                updateOne: {
                    filter: {"symbol": data.symbol},
                    update: {
                        $set: {
                            "symbol": data.symbol,
                            "volume24h": data.volume24h
                        }
                    },
                    upsert: true
                }
            }));

            await CoinModel.bulkWrite(bulkOperations);

            res.customResponse(200, "Sync All Coin Successful", "");

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

}
module.exports = CoinController 