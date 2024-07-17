const { RestClientV5 } = require('bybit-api');
const PositionModel = require('../models/position.model');
const BotModel = require('../models/bot.model');

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

            const newBotListID = botListID.map(item => item.value)

            if (botListID.length > 0) {
                const dataPosition = await PositionModel.find({ botID: { $in: botListID.map(item => item.value) } }).sort({ Time: -1 }).populate("botID")

                const updatePositionExist = Promise.allSettled(dataPosition.map(positionData => {
                    const client = new RestClientV5({
                        testnet: false,
                        key: positionData.botID.ApiKey,
                        secret: positionData.botID.SecretKey,
                    });

                    return client.getPositionInfo({
                        category: 'linear',
                        symbol: positionData.Symbol
                    }).then((response) => {

                        const viTheListItem = response.result.list[0];

                        const positionDataNew = {
                            Pnl: viTheListItem.unrealisedPnl,
                            Side: viTheListItem.side,
                            Price: +viTheListItem.avgPrice,
                            Symbol: viTheListItem.symbol,
                            Quantity: viTheListItem.size,
                            TimeUpdated: new Date()
                        };

                        if (positionDataNew.Quantity != 0) {
                            return PositionController.updatePositionBE({
                                newDataUpdate: positionDataNew,
                                orderID: positionData._id
                            })
                        } else {
                            return PositionController.deletePositionBE({
                                orderID: positionData._id
                            });
                        }

                    }).catch(error => {
                        console.log("Error", error);
                        return []; // For example, return an empty array if you want to continue
                    });
                }));

                const createPositionNew = Promise.allSettled(botListID.map(dataBotItem => {
                    const client = new RestClientV5({
                        testnet: false,
                        key: dataBotItem.ApiKey,
                        secret: dataBotItem.SecretKey,
                    });

                    return client.getPositionInfo({
                        category: 'linear',
                        settleCoin: "USDT"
                        // symbol: positionData.Symbol
                    }).then(async response => {
                        const viTheList = response.result.list;

                        return await Promise.allSettled(viTheList.map(viTheListItem => {
                            const positionData = {
                                Pnl: viTheListItem.unrealisedPnl,
                                Side: viTheListItem.side,
                                Price: +viTheListItem.avgPrice,
                                Symbol: viTheListItem.symbol,
                                Quantity: viTheListItem.size
                            };

                            const checkPositionExist = dataPosition.find(positionItem => positionItem.Symbol === viTheListItem.symbol && dataBotItem.value == positionItem.botID._id);

                            if (!checkPositionExist) {
                                return PositionController.createPositionBE({
                                    ...positionData,
                                    botID: dataBotItem.value,
                                    Miss: true
                                });
                            }
                        }));
                    }).catch(error => {
                        console.log("Error", error);
                        // Handle error as per your application's error handling strategy
                        // Return an appropriate value or handle the error here
                        return []; // For example, return an empty array if you want to continue
                    });
                }));

                await Promise.allSettled([updatePositionExist, createPositionNew])

                const newData = await PositionModel.find({ botID: { $in: newBotListID } }).populate("botID")

                res.customResponse(200, "Refresh Position Successful", newData);
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

        const closeLimitFunc = ({
            positionData,
            Quantity,
            Price
        }) => {
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
                .then(async (response) => {
                    if (response.retCode == 0) {

                        await PositionController.updatePositionBE({
                            newDataUpdate: {
                                Miss: false,
                                TimeUpdated: new Date()
                            },
                            orderID: positionData.id
                        })

                        return "Close Limit Successful"


                    }
                    else {
                        return "Close Limit Failed"
                    }
                })
                .catch((error) => {
                    return "Close Limit Error"
                });
        }


        PositionController.sendDataRealtime({
            type: "close-limit",
            data: {
                positionData,
                closeLimitFunc: closeLimitFunc({
                    positionData,
                    Quantity,
                    Price
                })
            }
        })

        res.customResponse(200, "Close Limit Successful");



    },

    // OTHER

    getPositionBySymbol: async ({ symbol, botID }) => {
        try {
            const data = await PositionModel.findOne({
                Symbol: symbol,
                botID: botID
            })

            if (data) {
                return {
                    message: "[Mongo] Re-Get Position Successful",
                    id: data._id
                }
            }
            else {
                return {
                    message: "[Mongo] Re-Get Position Failed",
                    id: data._id
                }
            }
        } catch (error) {
            return `[Mongo] Re-Get Position Error: ${error}`

        }
    },

    createPositionBE: async (newData) => {
        try {

            const newBot = new PositionModel({
                ...newData,
                Time: new Date(),
                TimeUpdated: new Date()
            });

            const savedBot = await newBot.save();

            if (savedBot) {
                return {
                    message: "[Mongo] Add Position Successful",
                    id: savedBot._id
                }
            }
            else {
                return {
                    message: "[Mongo] Add Position Failed",
                    id: ""
                }
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