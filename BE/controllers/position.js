const PositionModel = require('../models/position.model');

const BotApiController = {

    getAllPosition: async (req, res) => {
        try {
            const { botListID } = req.body
            const data = await PositionModel.find({ botID: { $in: botListID } }).populate("botID")
            // const data = await BotApiModel.find({ botID })
            res.customResponse(res.statusCode, "Get All Position Successful", data);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    createPosition: async (req, res) => {
        try {

            const newBot = new PositionModel(req.body);

            const savedBot = await newBot.save();

            res.customResponse(res.statusCode, "Add Position Successful", savedBot);

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Add Position Error" });
        }
    },

    updatePosition: async (req, res) => {
        try {

            const { orderID } = req.body;

            const result = await PositionModel.updateOne({ orderID: orderID }, { $set: req.body })

            if (result.acknowledged && result.matchedCount !== 0) {
                res.customResponse(200, "Update Position Successful", "");
            }
            else {
                res.customResponse(400, "Update Position failed", "");
            }

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Update Position Error" });
        }
    },

    deletePosition: async (req, res) => {
        try {
            const orderID = req.params.orderID;

            const result = await PositionModel.deleteOne({ orderID })

            if (result.deletedCount && result.deletedCount !== 0) {
                res.customResponse(200, "Delete Position Successful");
            }
            else {
                res.customResponse(400, "Delete Position failed", "");
            }

        } catch (error) {
            res.status(500).json({ message: "Delete Position Error" });
        }
    },

    updatePL: async (req, res) => {
        try {
            const { botListID } = req.body
            const data = await PositionModel.find({ botID: { $in: botListID } }).populate("botID")

            const { RestClientV5 } = require('bybit-api');

            if (data.length > 0) {

                const newData = await Promise.allSettled(data.map(positionData => {
                    const client = new RestClientV5({
                        testnet: false,
                        key: positionData.botID.ApiKey,
                        secret: positionData.botID.SecretKey,
                    });

                    return client
                        .getPositionInfo({
                            category: 'linear',
                            symbol: positionData.Symbol
                        })
                        .then((response) => {
                            positionData.Pnl = response.result.list[0].unrealisedPnl
                            return positionData
                        })
                        .catch((error) => {
                            console.error(error);
                        });
                }))
                return res.customResponse(res.statusCode, "Refresh Position Successful", newData.map(item=>item.value));
            }

            return res.customResponse(res.statusCode, "Refresh Position Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    // OTHER
    createPositionBE: async (newData) => {
        try {

            const { Symbol } = newData

            // const checkSymbolExists = await PositionModel.findOne({ Symbol })

            // if (!checkSymbolExists) {
            const newBot = new PositionModel({
                ...newData,
                Time: new Date()
            });

            const savedBot = await newBot.save();

            if (savedBot) {
                return "[_DB_] Add Position Successful"
            }
            else {
                return "[_DB_] Add Position Failed"
            }
            // }
            // else {
            //     const { orderID, ...data } = newData
            //     console.log(`Position for ${Symbol} already exists`);
            //     this.updatePositionBE({
            //         newDataUpdate: data,
            //         orderID
            //     })
            //     return "Re-Update Position Successful"
            // }

        } catch (error) {
            return `[_DB_] Add Position Error: ${error}`
        }
    },

    updatePositionBE: async ({
        newDataUpdate,
        orderID
    }) => {
        try {

            const result = await PositionModel.updateOne({ orderID: orderID }, {
                $set: {
                    ...newDataUpdate,
                    Time: new Date()
                }
            });

            if (result.acknowledged && result.matchedCount !== 0) {
                return "[_DB_] Update Position Successful"
            }
            else {
                return `[_DB_] Update Position Failed ${orderID}`
            }

        } catch (error) {
            return `[_DB_] Update Position Error: ${error}`
        }
    },

    deletePositionBE: async ({ orderID }) => {
        try {

            const result = await PositionModel.deleteOne({ orderID })

            if (result.deletedCount && result.deletedCount !== 0) {
                return "[_DB_] Delete Position Successful"
            }
            else {
                return `[_DB_] Delete Position Failed ${orderID}`
            }

        } catch (error) {
            return `[_DB_] Delete Position Error ${error}`
        }
    },
}

module.exports = BotApiController 