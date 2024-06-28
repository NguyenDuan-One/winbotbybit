// const { ObjectId } = require('mongodb');
const BotApiModel = require('../models/botApi.model');

const BotApiController = {
    getBotApiByBotListID: async (req, res) => {
        try {
            const botListID = req.body;
            const data = await BotApiModel.find({ "botID": { "$in": botListID } })
            // const data = await BotApiModel.find({ botID })
            res.customResponse(res.statusCode, "Get All Api Successful", data);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getBotApiByBotID: async (req, res) => {
        try {
            const botID = req.params.id;
            const data = await BotApiModel.find({ botID }).select("_id, UTA")
            // const data = await BotApiModel.find({ botID })
            res.customResponse(res.statusCode, "Get Api Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    create: async (req, res) => {
        try {

            const userID = req.user._id

            const newBot = new BotApiModel({
                ...req.body,
                userID
            });

            const savedBot = await newBot.save();

            res.customResponse(res.statusCode, "Add Api Successful", savedBot);

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Add Api Error" });
        }
    },
    update: async (req, res) => {
        try {

            const botApiID = req.params.id;

            const result = await BotApiModel.updateOne({ _id: botApiID }, { $set: req.body })

            if (result.acknowledged && result.matchedCount !== 0) {
                res.customResponse(200, "Update Api Successful", "");
            }
            else {
                res.customResponse(400, "Update Api failed", "");
            }

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Update Api Error" });
        }
    },

    // OTHER
    getBotApiByBotIDBE: async (botID) => {
        try {
            const data = await BotApiModel.findOne({ botID })
            return data
        } catch (err) {
            return ""
        }
    },

}

module.exports = BotApiController 