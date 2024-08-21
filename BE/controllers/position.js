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

    // updatePL: async (req, res) => {
    //     try {
    //         const { botListID } = req.body

    //         if (botListID.length > 0) {

    //             await Promise.allSettled(botListID.map(dataBotItem => {
    //                 const client = new RestClientV5({
    //                     testnet: false,
    //                     key: dataBotItem.ApiKey,
    //                     secret: dataBotItem.SecretKey,
    //                     syncTimeBeforePrivateRequests: true,
    //                 });

    //                 return client.getPositionInfo({
    //                     category: 'linear',
    //                     settleCoin: "USDT"
    //                     // symbol: positionData.Symbol
    //                 }).then(async response => {

    //                     const dataPosition = await PositionModel.find({ botID: dataBotItem.value }).populate("botID")

    //                     const viTheList = response.result.list;

    //                     if (viTheList?.length > 0) {
    //                         if (viTheList.length >= dataPosition.length) {
    //                             return Promise.allSettled(viTheList?.map(viTheListItem => {
    //                                 const positionDataNew = {
    //                                     Pnl: viTheListItem.unrealisedPnl,
    //                                     Side: viTheListItem.side,
    //                                     Price: +viTheListItem.avgPrice,
    //                                     Symbol: viTheListItem.symbol,
    //                                     Quantity: viTheListItem.size
    //                                 };
    //                                 const checkPositionExist = dataPosition.find(positionItem => positionItem.Symbol === viTheListItem.symbol && dataBotItem.value == positionItem.botID._id);

    //                                 if (checkPositionExist) {
    //                                     // if (+positionDataNew.Quantity != 0) {
    //                                     positionDataNew.TimeUpdated = new Date()
    //                                     return PositionController.updatePositionBE({
    //                                         newDataUpdate: positionDataNew,
    //                                         orderID: checkPositionExist._id
    //                                     })
    //                                     // } 
    //                                     // else {
    //                                     //     return PositionController.deletePositionBE({
    //                                     //         orderID: checkPositionExist._id
    //                                     //     });
    //                                     // }
    //                                 }
    //                                 else {
    //                                     return PositionController.createPositionBE({
    //                                         ...positionDataNew,
    //                                         botID: dataBotItem.value,
    //                                         Miss: true
    //                                     });
    //                                 }
    //                             }))
    //                         }
    //                         else {
    //                             return Promise.allSettled(dataPosition?.map(positionItem => {

    //                                 const checkPositionExist = viTheList.find(item => item.symbol === positionItem.Symbol && positionItem.botID._id == dataBotItem.value)

    //                                 if (checkPositionExist) {
    //                                     const positionDataNew = {
    //                                         Pnl: checkPositionExist.unrealisedPnl,
    //                                         Side: checkPositionExist.side,
    //                                         Price: +checkPositionExist.avgPrice,
    //                                         Symbol: checkPositionExist.symbol,
    //                                         Quantity: checkPositionExist.size
    //                                     };
    //                                     // if (+positionDataNew.Quantity != 0) {
    //                                     positionDataNew.TimeUpdated = new Date()
    //                                     return PositionController.updatePositionBE({
    //                                         newDataUpdate: positionDataNew,
    //                                         orderID: positionItem._id
    //                                     })
    //                                     // } 
    //                                     // else {
    //                                     //     return PositionController.deletePositionBE({
    //                                     //         orderID: positionItem._id
    //                                     //     });
    //                                     // }
    //                                 }
    //                                 else {
    //                                     return PositionController.deletePositionBE({
    //                                         orderID: positionItem._id
    //                                     });

    //                                 }
    //                             }))
    //                         }
    //                     }
    //                     else {
    //                         return PositionModel.deleteMany({ botID: dataBotItem.value })
    //                     }
    //                 }).catch(error => {
    //                     console.log("Error", error);
    //                     return [];
    //                 });
    //             }));

    //             const newData = await PositionModel.find({ botID: { $in: botListID.map(item => item.value) } }).populate("botID")

    //             res.customResponse(200, "Refresh Position Successful", newData);
    //         }
    //         else {
    //             res.customResponse(200, "Refresh Position Successful", "");
    //         }

    //     } catch (err) {
    //         res.status(500).json({ message: err.message });
    //     }
    // },

    updatePL: async (req, res) => {
        try {
            const { botListID } = req.body

            if (botListID.length > 0) {
                let newData = []

                await Promise.allSettled(botListID.map(dataBotItem => {

                    const client = new RestClientV5({
                        testnet: false,
                        key: dataBotItem.ApiKey,
                        secret: dataBotItem.SecretKey,
                        syncTimeBeforePrivateRequests: true,
                    });

                    return client.getPositionInfo({
                        category: 'linear',
                        settleCoin: "USDT"
                        // symbol: positionData.Symbol
                    }).then(async response => {

                        const dataPosition = await PositionModel.find({ botID: dataBotItem.value }).populate("botID")

                        const dataPositionObject = dataPosition.reduce((pre, cur) => {
                            pre[cur.Symbol] = cur
                            return pre
                        }, {})

                        const viTheList = response.result.list;


                        if (viTheList?.length > 0) {

                            newData = await Promise.all((viTheList.map(async viTheListItem => {

                                const Symbol = viTheListItem.symbol
                                const positionData = dataPositionObject[Symbol]
                                let data = {
                                    Pnl: viTheListItem.unrealisedPnl,
                                    Side: viTheListItem.side,
                                    Price: +viTheListItem.avgPrice,
                                    Symbol,
                                    Quantity: viTheListItem.size,

                                    botID: dataBotItem?.value,
                                    botName: dataBotItem?.name,
                                    botData: dataBotItem
                                }
                                if (positionData?._id) {
                                    data = {
                                        ...data,
                                        _id: positionData?._id,
                                        Time: positionData?.Time,
                                        TimeUpdated: positionData?.TimeUpdated,
                                        Miss: positionData.Miss,
                                    }
                                }
                                else {
                                    const resNew = await PositionController.createPositionBE(data)

                                    data = {
                                        ...data,
                                        _id: resNew?.id || `${dataBotItem?.value}-${Symbol}`,
                                        Time: new Date(),
                                        TimeUpdated: new Date(),
                                        Miss: true,
                                    }
                                }

                                delete dataPositionObject[Symbol]
                                return data
                            })))

                        }
                        else {
                            return await PositionModel.deleteMany({ botID: dataBotItem.value })
                        }

                        const positionOld = Object.values(dataPositionObject)
                        positionOld.length > 0 && await PositionModel.deleteMany({ _id: { $in: positionOld.map(item => item._id) } })

                    }).catch(error => {
                        console.log("Error", error);
                        return [];
                    });
                }));

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
            syncTimeBeforePrivateRequests: true,
        });
        client
            .submitOrder({
                category: 'linear',
                symbol: positionData.Symbol,
                side: positionData.Side === "Sell" ? "Buy" : "Sell",
                positionIdx: 0,
                orderType: 'Market',
                qty: Math.abs(Quantity).toString(),
                // price: Math.abs(positionData.Price).toString(),
            })
            .then((response) => {

                if (response.retCode == 0) {
                    res.customResponse(200, "Close Market Successful");
                }
                else {
                    res.customResponse(400, response.retMsg);
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
            syncTimeBeforePrivateRequests: true,
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
                reduceOnly: true
            })
            .then(async (response) => {
                if (response.retCode == 0) {

                    const result = await PositionModel.updateOne({ Symbol: symbol }, {
                        $set: {
                            Miss: false,
                            TimeUpdated: new Date()
                        }
                    });

                    if (result.acknowledged && result.matchedCount !== 0) {
                        console.log("[Mongo] Update Position Successful")
                    }
                    else {
                        console.log(`[Mongo] Update Position Failed`)
                    }

                    // PositionController.sendDataRealtime({
                    //     type: "close-limit",
                    //     data: {
                    //         positionData,
                    //         newOrderID: response.result.orderId
                    //     }
                    // })
                    res.customResponse(200, "Close Limit Successful");

                }
                else {
                    res.customResponse(400, response.retMsg);
                }
            })
            .catch((error) => {
                res.customResponse(500, `Close Limit Error: ${error}`);
            });

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
                    id: ""
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
                return `[Mongo] Update Position Failed`
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