const { RestClientV5, WebsocketClient } = require('bybit-api');
const StrategiesModel = require('../models/strategies.model')
const BotModel = require('../models/bot.model')
const { v4: uuidv4 } = require('uuid');
const { default: mongoose } = require('mongoose');

const dataCoinByBitController = {
    // SOCKET

    checkConditionStrategies: (strategiesData) => {
        return strategiesData.botID.Status === "Running" && strategiesData.botID.ApiKey
    },
    getAllStrategiesNewUpdate: async (TimeTemp) => {

        const resultFilter = await StrategiesModel.aggregate([
            {
                $match: {
                    children: {
                        $elemMatch: {
                            TimeTemp: TimeTemp
                        }
                    }
                }
            },
            {
                $project: {
                    label: 1,
                    value: 1,
                    volume24h: 1,
                    children: {
                        $filter: {
                            input: "$children",
                            as: "child",
                            cond: {
                                $and: [
                                    { $eq: ["$$child.TimeTemp", TimeTemp] }
                                ]
                            }
                        }
                    }
                }
            }
        ]);
        const result = await StrategiesModel.populate(resultFilter, {
            path: 'children.botID',
        })


        const newDataSocketWithBotData = result.flatMap((data) => data.children.map(child => {
            child.symbol = data.value
            child.value = `${data._id}-${child._id}`
            return child
        })) || []

        return newDataSocketWithBotData
    },
    sendDataRealtime: ({
        type,
        data
    }) => {
        const { socketServer } = require('../serverConfig');
        socketServer.emit(type, data)
        // socketServer.to("room2").emit(type, data)
    },
    // GET
    getSymbolFromCloud: async (userID) => {
        try {

            let ListCoin1m = []

            let wsConfig = {
                // key: API_KEY,
                // secret: PRIVATE_KEY,
                market: 'v5',
                recvWindow: 60000,

            }
            let wsInfo = {
                // key: API_KEY,
                // secret: PRIVATE_KEY,
                testnet: false,
                recv_window: 60000,
                enable_time_sync: true
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

    getAllStrategies: async (req, res) => {
        try {
            // const userID = req.user._id
            const { botListInput } = req.body

            const botList = botListInput.map(item=>new mongoose.Types.ObjectId(item))

            // const result = await StrategiesModel.find({ "children.userID": { "$in": [userID] } }).sort({ "label": 1 }).populate("children.botID")
            const resultFilter = await StrategiesModel.aggregate([
                {
                    // $match: { "children.userID": new mongoose.Types.ObjectId(userID) }
                    $match: { "children.botID": { $in: botList } }
                },
                {
                    $addFields: {
                        children: {
                            $filter: {
                                input: "$children",
                                as: "child",
                                cond: {
                                    $in: ["$$child.botID", botList],
                                }
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        childrenSorted: {
                            $function: {
                                body: function (children) {
                                    return children.sort((a, b) => a.OrderChange - b.OrderChange);
                                },
                                args: ["$children"],
                                lang: "js"
                            }
                        }
                    }
                },
                {
                    $project: {
                        label: 1,
                        value: 1,
                        volume24h: 1,
                        children: "$childrenSorted"
                    }
                },
                {
                    $sort: { "label": 1 }
                }
            ]);




            const result = await StrategiesModel.populate(resultFilter, {
                path: 'children.botID',
            })

            const handleResult = result.reduce((result, child) => {
                if (child.children.some(childData => childData.botID.Status === "Running")) {
                    result.push({
                        ...child,
                        children: child.children.filter(item => item.botID.Status === "Running")
                    })
                }
                return result
            }, []) || []

            res.customResponse(res.statusCode, "Get All Strategies Successful", handleResult);

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
    getAllSymbolWith24: async (req, res) => {
        try {
            const result = await StrategiesModel.find();

            res.customResponse(res.statusCode, "Get All Symbol Successful", result.map(item => ({
                _id: item._id,
                symbol: item.value,
                volume24h: item.volume24h,
            })))

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getTotalFutureByBot: async (req, res) => {
        try {

            const userID = req.params.id;

            const botListId = await BotModel.find({
                userID,
                ApiKey: { $exists: true, $ne: null },
                SecretKey: { $exists: true, $ne: null }
            })
                .select({ telegramToken: 0 }) // Loại bỏ trường telegramToken trong kết quả trả về
                .sort({ Created: -1 });

            const resultAll = await Promise.allSettled(botListId.map(async botData => dataCoinByBitController.getFutureBE(botData._id)))


            if (resultAll.some(item => item?.value?.totalWalletBalance)) {
                res.customResponse(200, "Get Total Future Successful", resultAll.reduce((pre, cur) => {
                    return pre + (+cur?.value?.totalWalletBalance || 0)
                }, 0))
            }
            else {
                res.customResponse(400, "Get Total Future Failed", "");
            }

        }

        catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    getTotalFutureSpot: async (req, res) => {
        try {

            const userID = req.params.id;

            const botListId = await BotModel.find({
                userID,
                ApiKey: { $exists: true, $ne: null },
                SecretKey: { $exists: true, $ne: null }
            })
                .select({ telegramToken: 0 }) // Loại bỏ trường telegramToken trong kết quả trả về
                .sort({ Created: -1 });

            const resultAll = await Promise.allSettled(botListId.map(async botData => dataCoinByBitController.getFutureSpotBE(botData._id)))

            if (resultAll.some(item => item?.value?.future && item?.value?.spotTotal)) {
                res.customResponse(200, "Get Total Future-Spot Successful", resultAll.reduce((pre, cur) => {
                    return pre + (+cur?.value?.future || 0) + (+cur?.value?.spotTotal || 0)
                }, 0))
            }
            else {
                res.customResponse(400, "Get Total Future-Spot Failed", "");
            }

        }

        catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    // CREATE
    createStrategies: async (req, res) => {

        try {
            const userID = req.user._id

            const { data, botListId, Symbol } = req.body

            let result

            const TimeTemp = new Date().toString()

            const newData = {
                ...data,
                EntryTrailing: data.EntryTrailing || 40
            }

            if (newData.PositionSide === "Both") {
                result = await StrategiesModel.updateMany(
                    { "value": { "$in": Symbol } },
                    {
                        "$push": {
                            "children": [
                                ...botListId.map(botID => ({ ...newData, PositionSide: "Long", botID, userID, TimeTemp })),
                                ...botListId.map(botID => ({ ...newData, PositionSide: "Short", botID, userID, TimeTemp }))
                            ]
                        }
                    },
                    { new: true }
                )
            }
            else {
                result = await StrategiesModel.updateMany(
                    { "value": { "$in": Symbol } },
                    { "$push": { "children": botListId.map(botID => ({ ...newData, botID, userID, TimeTemp })) } },
                    { new: true }
                );
            }

            const resultFilter = await StrategiesModel.aggregate([
                {
                    $match: {
                        children: {
                            $elemMatch: {
                                IsActive: true,
                                userID: new mongoose.Types.ObjectId(userID),
                                TimeTemp: TimeTemp
                            }
                        }
                    }
                },
                {
                    $project: {
                        label: 1,
                        value: 1,
                        volume24h: 1,
                        children: {
                            $filter: {
                                input: "$children",
                                as: "child",
                                cond: {
                                    $and: [
                                        { $eq: ["$$child.IsActive", true] },
                                        { $eq: ["$$child.userID", new mongoose.Types.ObjectId(userID)] },
                                        { $eq: ["$$child.TimeTemp", TimeTemp] }
                                    ]
                                }
                            }
                        }
                    }
                }
            ]);


            const resultGet = await StrategiesModel.populate(resultFilter, {
                path: 'children.botID',
            })

            const handleResult = resultGet.flatMap((data) => data.children.map(child => {
                child.symbol = data.value
                child.value = `${data._id}-${child._id}`
                return child
            })) || []

            handleResult.length > 0 && dataCoinByBitController.sendDataRealtime({
                type: "add",
                data: handleResult
            })

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

            const { parentID, newData, symbol } = req.body

            const result = await StrategiesModel.updateOne(
                { "children._id": strategiesID, _id: parentID },
                { $set: { "children.$": newData } }
            )

            if (dataCoinByBitController.checkConditionStrategies(newData)) {
                dataCoinByBitController.sendDataRealtime({
                    type: "update",
                    data: [{
                        ...newData,
                        value: `${parentID}-${strategiesID}`,
                        symbol
                    }]
                })
            }

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

            const TimeTemp = new Date().toString()

            const bulkOperations = dataList.map(data => ({
                updateOne: {
                    filter: { "children._id": data.id, _id: data.parentID },
                    update: {
                        $set: {
                            "children.$": {
                                ...data.UpdatedFields,
                                TimeTemp
                            }
                        }
                    }
                }
            }));

            const bulkResult = await StrategiesModel.bulkWrite(bulkOperations);

            if (bulkResult.modifiedCount === dataList.length) {
                res.customResponse(200, "Update Mul-Strategies Successful", "");
            }
            else {
                res.customResponse(400, `Update Mul-Strategies Failed ${dataList.length - bulkResult.modifiedCount} `);

            }

            const newDataSocketWithBotData = await dataCoinByBitController.getAllStrategiesNewUpdate(TimeTemp)

            newDataSocketWithBotData.length > 0 && dataCoinByBitController.sendDataRealtime({
                type: "update",
                data: newDataSocketWithBotData
            })

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Update Mul-Strategies Error" });
        }
    },

    // DELETE
    deleteStrategies: async (req, res) => {
        try {

            const strategiesID = req.params.id;

            const resultGet = await StrategiesModel.findOne(
                { _id: strategiesID },
            ).populate("children.botID")

            const newDataSocketWithBotData = resultGet.children.map(child => {
                child.symbol = resultGet.value
                child.value = `${resultGet._id}-${child._id}`
                return child
            }) || []

            newDataSocketWithBotData.length > 0 && dataCoinByBitController.sendDataRealtime({
                type: "delete",
                data: newDataSocketWithBotData
            })

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

            const { id, parentID } = req.body;

            const resultFilter = await StrategiesModel.aggregate([
                {
                    $match: {
                        "_id": new mongoose.Types.ObjectId(parentID),
                    }
                },
                {
                    $project: {
                        label: 1,
                        value: 1,
                        volume24h: 1,
                        children: {
                            $filter: {
                                input: "$children",
                                as: "child",
                                cond: { $eq: ["$$child._id", new mongoose.Types.ObjectId(id)] }
                            }
                        }
                    }
                }
            ]);

            const resultGet = await StrategiesModel.populate(resultFilter, {
                path: 'children.botID',
            })
            const newDataSocketWithBotData = resultGet[0].children.map(child => {
                child.symbol = resultGet.value
                child.value = `${parentID}-${id}`
                return child
            }) || []

            newDataSocketWithBotData.length > 0 && dataCoinByBitController.sendDataRealtime({
                type: "delete",
                data: newDataSocketWithBotData
            })

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

            const parentIDs = strategiesIDList.map(item => new mongoose.Types.ObjectId(item.parentID));
            const ids = strategiesIDList.map(item => new mongoose.Types.ObjectId(item.id));

            const resultFilter = await StrategiesModel.aggregate([
                {
                    $match: {
                        "_id": { $in: parentIDs }
                    }
                },
                {
                    $project: {
                        label: 1,
                        value: 1,
                        volume24h: 1,
                        children: {
                            $filter: {
                                input: "$children",
                                as: "child",
                                cond: {
                                    $in: ["$$child._id", ids]
                                }
                            }
                        }
                    }
                }
            ]);

            const resultGet = await StrategiesModel.populate(resultFilter, {
                path: 'children.botID',
            })

            const handleResult = resultGet.flatMap((data) => data.children.map(child => {
                child.symbol = data.value
                child.value = `${data._id}-${child._id}`
                return child
            })) || []

            handleResult.length > 0 && dataCoinByBitController.sendDataRealtime({
                type: "delete",
                data: handleResult
            })

            const bulkOperations = strategiesIDList.map(data => ({
                updateOne: {
                    filter: { _id: data.parentID },
                    update: { $pull: { children: { _id: data.id } } }
                }
            }));

            const bulkResult = await StrategiesModel.bulkWrite(bulkOperations);

            // if (result.acknowledged && result.deletedCount !== 0) {
            if (bulkResult.modifiedCount === strategiesIDList.length) {
                res.customResponse(200, "Delete Strategies Successful");
            }
            else {
                res.customResponse(400, `Delete Strategies Failed ${strategiesIDList.length - bulkResult.modifiedCount} `);
            }

        } catch (error) {
            res.status(500).json({ message: "Delete Strategies Error" });
        }
    },

    // OTHER

    copyMultipleStrategiesToSymbol: async (req, res) => {

        try {
            const { symbolListData, symbolList } = req.body

            const TimeTemp = new Date().toString()

            const bulkOperations = [];

            // Lặp qua danh sách symbolList và tạo các thao tác push vào mảng bulkOperations
            symbolList.forEach(symbol => {
                const filter = { "value": symbol };
                const update = {
                    $push: {
                        "children": {
                            $each: symbolListData.map(data => {
                                const newObj = { ...data, TimeTemp };
                                delete newObj?._id
                                delete newObj?.value
                                return newObj

                            })
                        }
                    }
                };

                bulkOperations.push({
                    updateOne: {
                        filter,
                        update
                    }
                });
            });

            const bulkResult = await StrategiesModel.bulkWrite(bulkOperations);

            if (bulkResult.modifiedCount === symbolList.length) {

                res.customResponse(200, "Copy Strategies To Symbol Successful", []);
            }
            else {
                res.customResponse(400, "Copy Strategies To Symbol Failed", "");
            }
            const newDataSocketWithBotData = await dataCoinByBitController.getAllStrategiesNewUpdate(TimeTemp)

            newDataSocketWithBotData.length > 0 && dataCoinByBitController.sendDataRealtime({
                type: "update",
                data: newDataSocketWithBotData
            })

        }

        catch (error) {
            res.status(500).json({ message: error.message });
        }

    },

    copyMultipleStrategiesToBot: async (req, res) => {

        try {
            const { symbolListData, symbolList } = req.body

            const TimeTemp = new Date().toString();

            const bulkOperations = symbolListData.map(data => ({
                updateOne: {
                    filter: { _id: data.parentID },
                    update: {
                        $push: {
                            children: {
                                $each: symbolList.map(item => {
                                    const newObj = { ...data };
                                    delete newObj?._id;
                                    delete newObj?.value;
                                    return ({
                                        ...newObj,
                                        botID: item,
                                        TimeTemp
                                    })
                                })
                            }
                        }
                    }
                }
            }))

            const bulkResult = await StrategiesModel.bulkWrite(bulkOperations);

            if (bulkResult.modifiedCount === symbolListData.length) {
                res.customResponse(200, "Copy Strategies To Bot Successful", "");
            }
            else {
                res.customResponse(400, "Copy Strategies To Bot Failed", "");
            }

            const newDataSocketWithBotData = await dataCoinByBitController.getAllStrategiesNewUpdate(TimeTemp)

            newDataSocketWithBotData.length > 0 && dataCoinByBitController.sendDataRealtime({
                type: "update",
                data: newDataSocketWithBotData
            })


        }

        catch (error) {
            res.status(500).json({ message: error.message });
        }

    },

    syncSymbol: async (req, res) => {
        try {
            const userID = req.user._id

            const listSymbolObject = await dataCoinByBitController.getSymbolFromCloud(userID);

            if (listSymbolObject?.length) {


                const existingDocs = await StrategiesModel.find({ value: { $in: listSymbolObject.map(item => item.symbol) } });

                const existingValues = existingDocs.map(doc => doc.value);

                const valuesToAdd = listSymbolObject.filter(value => !existingValues.includes(value.symbol));

                const newSymbolList = []
                const newSymbolNameList = []

                valuesToAdd.forEach(value => {
                    newSymbolList.push({
                        label: value.symbol,
                        value: value.symbol,
                        volume24h: value.volume24h,
                        children: []
                    });
                    newSymbolNameList.push(value.symbol);
                })
                await StrategiesModel.insertMany(newSymbolList)

                if (newSymbolList.length > 0) {
                    res.customResponse(200, "Have New Sync Successful", newSymbolList[0].label)

                    const newSymbolResult = await StrategiesModel.find({
                        value: { $in: newSymbolNameList }
                    })

                    dataCoinByBitController.sendDataRealtime({
                        type: "sync-symbol",
                        data: newSymbolResult
                    })
                }
                else {
                    res.customResponse(200, "Sync Successful", [])
                }
            }
            else {
                res.customResponse(400, "Sync Failed", []);

            }

        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    transferFunds: async (amount, FromWallet, ToWallet) => {

        const client = new RestClientV5({
            key: API_KEY,
            secret: SECRET_KEY,
            recv_window: 60000,
            enable_time_sync: true
        });

        let myUUID = uuidv4();
        client.createInternalTransfer(
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


    balanceWallet: async (req, res) => {

        try {
            // FUND: Spot
            // UNIFIED: Future
            const { amount, futureLarger, botID } = req.body

            const resultApiKey = await dataCoinByBitController.getApiKeyByBot(botID)

            if (resultApiKey) {

                let FromWallet = "FUND"
                let ToWallet = "UNIFIED"

                if (futureLarger) {
                    FromWallet = "UNIFIED"
                    ToWallet = "FUND"
                }

                const client = new RestClientV5({
                    testnet: false,
                    key: resultApiKey.API_KEY,
                    secret: resultApiKey.SECRET_KEY,
                    recv_window: 60000,
                    enable_time_sync: true
                });

                let myUUID = uuidv4();

                // console.log(myUUID, FromWallet, ToWallet, amount, futureLarger);
                client.createInternalTransfer(
                    myUUID,
                    'USDT',
                    amount.toFixed(4),
                    FromWallet,
                    ToWallet,
                )
                    .then((response) => {
                        const status = response.result.status == "SUCCESS"
                        status ? res.customResponse(200, "Saving Successful", "") : res.customResponse(500, "Saving Error", "")

                    })
                    .catch((error) => {
                        res.customResponse(500, "Saving Error", "");
                    });
            }
            else {
                res.customResponse(500, "Saving Error", "");
            }

        }
        catch (error) {
            res.customResponse(500, "Saving Error", "");
        }
    },

    getApiKeyByBot: async (botID) => {

        const resultApi = await BotModel.findOne({ _id: botID })

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
                    testnet: false,
                    key: resultApiKey.API_KEY,
                    secret: resultApiKey.SECRET_KEY,
                    recv_window: 60000,
                    enable_time_sync: true
                });

                // get field totalWalletBalance
                await client.getWalletBalance({
                    accountType: 'UNIFIED',
                    coin: 'USDT',
                }).then((result) => {
                    res.customResponse(200, "Get Future Available Successful", result);
                })
                    .catch((error) => {
                        res.customResponse(400, error.message, "");
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
                    testnet: false,
                    key: resultApiKey.API_KEY,
                    secret: resultApiKey.SECRET_KEY,
                    recv_window: 60000,
                    enable_time_sync: true
                });

                await client.getAllCoinsBalance({
                    accountType: 'FUND',
                    coin: 'USDT'
                }).then((result) => {
                    res.customResponse(200, "Get Spot Total Successful", result);
                })
                    .catch((error) => {
                        res.customResponse(400, error.message, "");
                    });
            }
            else {
                res.customResponse(400, "Get Spot Total Failed", "");
            }

        } catch (error) {
            res.customResponse(500, "Get Spot Total Error", "");

        }

    },

    // OTHER

    getFutureSpotBE: async (botID) => {

        try {

            const resultApiKey = await dataCoinByBitController.getApiKeyByBot(botID)

            if (resultApiKey) {
                const API_KEY = resultApiKey.API_KEY;
                const SECRET_KEY = resultApiKey.SECRET_KEY;

                const client = new RestClientV5({
                    testnet: false,
                    key: API_KEY,
                    secret: SECRET_KEY,
                    recv_window: 60000,
                    enable_time_sync: true
                });

                // get field totalWalletBalance
                const getFuture = client.getWalletBalance({
                    accountType: 'UNIFIED',
                    coin: 'USDT',
                })
                const getSpot = client.getAllCoinsBalance({
                    accountType: 'FUND',
                    coin: 'USDT'
                })
                const result = await Promise.all([getFuture, getSpot])

                if (result.every(item => item.retCode === 0)) {
                    return {
                        future: result[0]?.result?.list?.[0]?.coin[0].walletBalance || 0,
                        spotTotal: result[1]?.result?.balance?.[0]?.walletBalance || 0,
                        API_KEY,
                        SECRET_KEY
                    }
                }
                return {}
            }
            else {
                return {}
            }

        } catch (error) {
            return {}

        }
    },

    getFutureBE: async (botID) => {

        try {

            const resultApiKey = await dataCoinByBitController.getApiKeyByBot(botID)

            if (resultApiKey) {
                const API_KEY = resultApiKey.API_KEY;
                const SECRET_KEY = resultApiKey.SECRET_KEY;

                const client = new RestClientV5({
                    testnet: false,
                    key: API_KEY,
                    secret: SECRET_KEY,
                    recv_window: 60000,
                    enable_time_sync: true
                });

                // get field totalWalletBalance
                const result = await client.getWalletBalance({
                    accountType: 'UNIFIED',
                    coin: 'USDT',
                })

                if (result.retCode === 0) {
                    return {
                        totalWalletBalance: result.result?.list?.[0]?.coin[0].walletBalance || 0,
                        botID
                    }
                }
                return 0

            }
        } catch (error) {
            return 0

        }
    },
    balanceWalletBE: async ({ amount, futureLarger, API_KEY, SECRET_KEY }) => {
        try {
            // FUND: Spot
            // UNIFIED: Future

            if (API_KEY && SECRET_KEY) {

                let FromWallet = "FUND"
                let ToWallet = "UNIFIED"

                if (futureLarger) {
                    FromWallet = "UNIFIED"
                    ToWallet = "FUND"
                }

                const client = new RestClientV5({
                    testnet: false,
                    key: API_KEY,
                    secret: SECRET_KEY,
                    recv_window: 60000,
                    enable_time_sync: true
                });

                let myUUID = uuidv4();

                client.createInternalTransfer(
                    myUUID,
                    'USDT',
                    amount.toFixed(4),
                    FromWallet,
                    ToWallet,
                )
                    .then((response) => {
                        const status = response.result.status == "SUCCESS"
                        if (status) {
                            // console.log("-> Saving Successful");
                        }
                        else {
                            console.log("-> Saving Error");
                        }

                    })
                    .catch((error) => {
                        console.log("-> Saving Error");
                    });
            }
            else {
                console.log("-> Saving Error");
            }

        }
        catch (error) {
            console.log("-> Saving Error");
        }
    },

    getAllStrategiesActive: async () => {
        try {
            require("../models/bot.model")

            const resultFilter = await StrategiesModel.aggregate([
                {
                    $match: { "children.IsActive": true }
                },
                {
                    $project: {
                        label: 1,
                        value: 1,
                        volume24h: 1,
                        children: {
                            $filter: {
                                input: "$children",
                                as: "child",
                                cond: { $eq: ["$$child.IsActive", true] }
                            }
                        }
                    }
                }
            ]);
            const result = await StrategiesModel.populate(resultFilter, {
                path: 'children.botID',
            })


            const handleResult = result.flatMap((data) => data.children.map(child => {
                child.symbol = data.value
                child.value = `${data._id}-${child._id}`
                return child
            })) || []

            return handleResult

            // const handleResult = result.reduce((result, child) => {
            //     if (child.children.length > 0 && child.children.some(childData =>
            //         dataCoinByBitController.checkConditionStrategies(childData)
            //     )) {
            //         result.push({
            //             ...child,
            //             children: child.children.filter(item =>
            //                 dataCoinByBitController.checkConditionStrategies(item)
            //             )
            //         })
            //     }
            //     return result
            // }, []) || []

        } catch (err) {
            return []
        }
    },
    getAllSymbolBE: async (req, res) => {
        try {
            const result = await StrategiesModel.find();
            return result || []

        } catch (err) {
            return []
        }
    },

}

module.exports = dataCoinByBitController 