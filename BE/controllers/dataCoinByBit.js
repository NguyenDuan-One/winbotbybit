const { RestClientV5, WebsocketClient } = require('bybit-api');
const StrategiesModel = require('../models/strategies')
const BotApiModel = require('../models/botApi.model')
const { v4: uuidv4 } = require('uuid');


const dataCoinByBitController = {
    // GET
    getSymbolFromCloud: async (userID) => {
        try {

            let ListCoin1m = []

            let wsConfig = {
                // key: API_KEY,
                // secret: PRIVATE_KEY,
                market: 'v5'
            }
            let wsInfo = {
                // key: API_KEY,
                // secret: PRIVATE_KEY,
                testnet: false,
                enable_time_sync: true,
                timestamp: new Date().toISOString(),
                recvWindow: 200000,
            }
            let wsSymbol = new WebsocketClient(wsConfig);
            let CoinInfo = new RestClientV5(wsInfo);

            let data = []
            await CoinInfo.getTickers({ category: 'linear' })
                .then((rescoin) => {
                    rescoin.result.list.forEach((e) => {
                        if (e.symbol.indexOf("USDT") > 0) {
                            data.push(e.symbol)
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
    getAllStrategies: async (req, res) => {
        try {
            const result = await StrategiesModel.find({ "children.0": { $exists: true } }).sort({ label: 1 }).populate("children.botID");

            res.customResponse(res.statusCode, "Get All Strategies Successful", result);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getAllSymbol: async (req, res) => {
        try {
            const result = await StrategiesModel.find();

            res.customResponse(res.statusCode, "Get All Symbol Successful", result.map(item => item.value));

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    // CREATE
    createStrategies: async (req, res) => {

        try {
            const { data: newData, botListId, symbolList } = req.body


            let result
            if (newData.PositionSide === "Both") {
                result = await StrategiesModel.updateMany(
                    { "value": { "$in": symbolList } },
                    {
                        "$push": {
                            "children": [
                                ...botListId.map(botID => ({ ...newData, PositionSide: "Long", botID, Created: new Date() })),
                                ...botListId.map(botID => ({ ...newData, PositionSide: "Short", botID, Created: new Date() }))
                            ]
                        }
                    }
                )
            }
            else {
                result = await StrategiesModel.updateMany(
                    { "value": { "$in": symbolList } },
                    { "$push": { "children": botListId.map(botID => ({ ...newData, botID, Created: new Date() })) } }
                );
            }

            if (result.acknowledged && result.matchedCount !== 0) {

                res.customResponse(200, "Add New Strategies Successful", []);
            }
            else {
                res.customResponse(400, "Add New Strategies Failed", "");
            }

        }

        catch (error) {
            res.status(500).json({ message: error.message });
        }

    },

    // UPDATE
    updateStrategiesByID: async (req, res) => {
        try {

            const strategiesID = req.params.id;

            const { parentID, newData } = req.body

            const result = await StrategiesModel.updateOne(
                { "children._id": strategiesID, _id: parentID },
                { $set: { "children.$": newData } }
            )

            if (result.acknowledged && result.matchedCount !== 0) {
                res.customResponse(200, "Update Strategies Successful", "");
            }
            else {
                res.customResponse(400, "Update Strategies Failed", "");
            }

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Update Strategies Error" });
        }
    },
    updateStrategiesMultiple: async (req, res) => {
        try {

            const dataList = req.body

            let resultAll = []

            for (data of dataList) {
                const result = await StrategiesModel.updateOne(
                    { "children._id": data.id, _id: data.parentID },
                    { $set: { "children.$": data.UpdatedFields } }
                )
                resultAll.push(result.acknowledged && result.matchedCount !== 0)
            }

            if (resultAll.every(result => result === true)) {
                res.customResponse(200, "Update Strategies Successful", "");
            }
            else {
                res.customResponse(400, "Update Strategies Failed", "");
            }

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Update Strategies Error" });
        }
    },

    // DELETE
    deleteStrategies: async (req, res) => {
        try {

            const strategiesID = req.params.id;

            const result = await StrategiesModel.deleteOne(
                { _id: strategiesID },
            );


            if (result.acknowledged && result.deletedCount !== 0) {

                res.customResponse(200, "Delete Strategies Successful");
            }
            else {
                res.customResponse(400, "Delete Strategies failed");
            }

        } catch (error) {
            res.status(500).json({ message: "Delete Strategies Error" });
        }
    },
    deleteStrategiesItem: async (req, res) => {
        try {

            const { id, parentID } = req.body

            const result = await StrategiesModel.updateOne(
                { _id: parentID },
                { $pull: { children: { _id: id } } }
            );

            if (result.acknowledged && result.deletedCount !== 0) {

                res.customResponse(200, "Delete Strategies Successful");
            }
            else {
                res.customResponse(400, "Delete Strategies failed");
            }

        } catch (error) {
            res.status(500).json({ message: "Delete Strategies Error" });
        }
    },
    deleteStrategiesMultiple: async (req, res) => {
        try {

            const strategiesIDList = req.body

            const result = await StrategiesModel.deleteMany({ _id: { "$in": strategiesIDList } })

            if (result.acknowledged && result.deletedCount !== 0) {

                res.customResponse(200, "Delete Strategies Successful");
            }
            else {
                res.customResponse(400, "Delete Strategies failed");
            }

        } catch (error) {
            res.status(500).json({ message: "Delete Strategies Error" });
        }
    },

    // OTHER
    syncSymbol: async (req, res) => {
        try {
            const userID = req.user._id

            const listSymbol = await dataCoinByBitController.getSymbolFromCloud(userID)

            if (listSymbol?.length) {
                const existingDocs = await StrategiesModel.find({ value: { $in: listSymbol } });

                const existingValues = existingDocs.map(doc => doc.value);

                const valuesToAdd = listSymbol.filter(value => !existingValues.includes(value));

                await StrategiesModel.insertMany(valuesToAdd.map(value => ({
                    label: value,
                    value: value,
                    children: []
                })))
                res.customResponse(200, "Sync Successful", []);
            }
            else {
                res.customResponse(400, "Sync Failed", []);

            }



        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    transferFunds: async (acc, amount, FromWallet, ToWallet) => {
        let myUUID = uuidv4();
        client[acc].createInternalTransfer(
            myUUID,
            'USDT',
            amount,
            FromWallet,
            ToWallet,
        )
            .then((response) => {
                console.log(response);
            })
            .catch((error) => {
                console.error(error);
            });
    },

    myScheduledFunction: async () => {
        this.fetchWalletBalanceForClient(0);
        this.getfund(0);
        for (let i = 0; i < totalWalletBalance.length; i++) {
            let fundingBalance = balances[i];// funding
            let unifiedBalance = totalWalletBalance[i];// unidified

            let totalBalance = Number(fundingBalance) + Number(unifiedBalance);
            let targetBalance = totalBalance / 2;

            if (fundingBalance > targetBalance) {
                let amountToTransfer = fundingBalance - targetBalance;
                amountToTransfer = amountToTransfer.toFixed(2);
                if (amountToTransfer >= 1) {
                    logger.info(`API ${i}: Transfer Spot => Future: ${amountToTransfer} $ `);
                    await this.transferFunds(i, amountToTransfer, 'FUND', 'UNIFIED');
                }
            } else if (unifiedBalance > targetBalance) {
                let amountToTransfer = unifiedBalance - targetBalance;
                amountToTransfer = amountToTransfer.toFixed(2);
                if (amountToTransfer >= 1) {
                    logger.info(`API ${i}: Transfer Future => Spot: ${amountToTransfer} $ `);
                    await this.transferFunds(i, amountToTransfer, 'UNIFIED', 'FUND');
                }
            } else {
                console.log(`API ${i}: Balances are already equal.`);
            }
        }
        await this.showbl()
    },

    getApiKeyByBot: async (botID) => {

        const resultApi = await BotApiModel.findOne({ botID })

        if (!resultApi) {
            return ""
        }
        return {
            API_KEY: resultApi.ApiKey,
            SECRET_KEY: resultApi.SecretKey
        }
    },

    getFutureAvailable: async (req, res) => {

        try {
            const botID = req.params.id

            const resultApiKey = await dataCoinByBitController.getApiKeyByBot(botID)

            if (resultApiKey) {
                const client = new RestClientV5({
                    key: resultApiKey.API_KEY,
                    secret: resultApiKey.SECRET_KEY,
                });

                // get field totalWalletBalance
                await client.getWalletBalance({
                    accountType: 'UNIFIED',
                    coin: 'USDT',
                }).then((result) => {
                    res.customResponse(200, "Get Future Available Successful", result);
                })
                    .catch((error) => {
                        res.customResponse(error.code, error.message, "");
                    });
            }
            else {
                res.customResponse(400, "Get Future Available Failed", "");
            }

        } catch (error) {
            res.customResponse(500, "Get Future Available Error", "");

        }

    },

    getSpotTotal: async (req, res) => {

        try {
            const botID = req.params.id

            const resultApiKey = await dataCoinByBitController.getApiKeyByBot(botID)

            if (resultApiKey) {
                const client = new RestClientV5({
                    key: resultApiKey.API_KEY,
                    secret: resultApiKey.SECRET_KEY,
                });

                await client.getAllCoinsBalance({
                    accountType: 'FUND',
                    coin: 'USDT'
                }).then((result) => {
                    res.customResponse(200, "Get Spot Total Successful", result);
                })
                    .catch((error) => {
                        res.customResponse(error.code, error.message, "");
                    });
            }
            else {
                res.customResponse(400, "Get Spot Total Failed", "");
            }

        } catch (error) {
            res.customResponse(500, "Get Spot Total Error", "");

        }

    }
}

module.exports = dataCoinByBitController 