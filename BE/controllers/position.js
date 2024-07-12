const { RestClientV5 } = require('bybit-api');
const PositionModel = require('../models/position.model');

const PositionController = {

    // OTHER 

    sendDataRealtime: ({
        type,
        data
    }) => {
        const { socketServer } = require('../serverConfig');
        socketServer.emit(type, data)
    },
    // 
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

    updatePL: async (req, res) => {
        try {
            const { botListID } = req.body
            const data = await PositionModel.find({ botID: { $in: botListID } }).sort({ Time: -1 }).populate("botID")

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
                            const sizeNew = response.result.list[0].size

                            positionData.Pnl = response.result.list[0].unrealisedPnl
                            positionData.Side = response.result.list[0].side
                            positionData.Price = +response.result.list[0].entryPrice
                            positionData.Quantity = sizeNew

                            sizeNew != 0 ? PositionController.updatePositionBE({
                                newDataUpdate: positionData,
                                orderID: positionData.orderID
                            }) : PositionController.deletePositionBE({
                                orderID: positionData.orderID
                            })
                            return positionData
                        })
                        .catch((error) => {
                            console.log("Error", error);
                        });
                }))
                res.customResponse(200, "Refresh Position Successful", newData.map(item => item.value));
            }
            else {
                res.customResponse(200, "Refresh Position Successful", "");
            }

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getPriceLimitCurrent: async (req, res) => {
        try {
            const { symbol } = req.body

            const client = new RestClientV5({
                testnet: false,
            });

            await client.getKline({
                category: 'linear',
                symbol,
                interval: '1',
            }).then(response => {
                const priceCurrent = response.result.list[0]?.[4]
                res.customResponse(200, "Get Price Current Successful", priceCurrent);
            }).catch(err => {
                res.customResponse(400, "Get Price Current Failed", "");
            })

        } catch (error) {
            res.customResponse(500, "Get Price Current Error", "");
        }
    },

    closeMarket: async (req, res) => {

        const { positionData, Quantity } = req.body

        const client = new RestClientV5({
            testnet: false,
            key: positionData.botData.ApiKey,
            secret: positionData.botData.SecretKey,
        });
        client
            .submitOrder({
                category: 'linear',
                symbol: positionData.Symbol,
                side: positionData.Side === "Sell" ? "Buy" : "Sell",
                positionIdx: 0,
                orderType: 'Market',
                qty: Math.abs(Quantity).toString(),
                price: positionData.Price,
            })
            .then((response) => {
                if (response.retCode == 0) {
                    res.customResponse(200, "Close Market Successful");
                }
                else {
                    res.customResponse(400, "Close Market Failed");
                }
            })
            .catch((error) => {
                res.customResponse(500, "Close Market Error");
            });
    },

    closeLimit: async (req, res) => {

        const { positionData, Quantity, Price } = req.body

        const symbol = positionData.Symbol
        const client = new RestClientV5({
            testnet: false,
            key: positionData.botData.ApiKey,
            secret: positionData.botData.SecretKey,
        });
        client
            .submitOrder({
                category: 'linear',
                symbol,
                side: positionData.Side === "Sell" ? "Buy" : "Sell",
                positionIdx: 0,
                orderType: 'Limit',
                qty: Math.abs(Quantity).toString(),
                price: Math.abs(Price).toString(),
            })
            .then((response) => {
                if (response.retCode == 0) {
                    res.customResponse(200, "Close Limit Successful");

                    PositionController.sendDataRealtime({
                        type: "close-limit",
                        data: {
                            positionData
                        }
                    })
                }
                else {
                    res.customResponse(400, "Close Limit Failed");
                }
            })
            .catch((error) => {
                res.customResponse(500, "Close Limit Error");
            });
    },

    // OTHER
    createPositionBE: async (newData) => {
        try {

            const newBot = new PositionModel({
                ...newData,
                Time: new Date()
            });

            const savedBot = await newBot.save();

            if (savedBot) {
                return {
                    message: "[Mongo] Add Position Successful",
                    id: savedBot._id
                }
            }
            else {
                return "[Mongo] Add Position Failed"
            }

        } catch (error) {
            return `[Mongo] Add Position Error: ${error}`
        }
    },

    updatePositionBE: async ({
        newDataUpdate,
        orderID
    }) => {
        try {
            const result = await PositionModel.updateOne({ _id: orderID }, {
                $set: newDataUpdate
            });

            if (result.acknowledged && result.matchedCount !== 0) {
                return "[Mongo] Update Position Successful"
            }
            else {
                return `[Mongo] Update Position Failed ${orderID}`
            }

        } catch (error) {
            return `[Mongo] Update Position Error: ${error}`
        }
    },

    deletePositionBE: async ({ orderID }) => {
        try {

            const result = await PositionModel.deleteOne({ _id: orderID })

            if (result.deletedCount && result.deletedCount !== 0) {
                return "[Mongo] Delete Position Successful"
            }
            else {
                return `[Mongo] Delete Position Failed ${orderID}`
            }

        } catch (error) {
            return `[Mongo] Delete Position Error ${error}`
        }
    },


}

module.exports = PositionController 