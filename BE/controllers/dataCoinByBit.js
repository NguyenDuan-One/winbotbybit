const { RestClientV5, WebsocketClient } = require('bybit-api');
const StrategiesModel = require('../models/strategies')
const BotApiModel = require('../models/botApi.model')


const dataCoinByBitController = {
    getSymbolFromCloud: async (userID) => {
        try {
            const resultApi = await BotApiModel.findOne({ userID })

            if (!resultApi) {
                return []
            }
            const API_KEY = resultApi.ApiKey
            const PRIVATE_KEY = resultApi.SecretKey

            let ListCoin1m = []

            let wsConfig = {
                key: API_KEY,
                secret: PRIVATE_KEY,
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

}

module.exports = dataCoinByBitController 