// const { ObjectId } = require('mongodb');
const BotModel = require('../models/bot.model');
const UserModel = require('../models/user.model');

const BotController = {
    getAllBot: async (req, res) => {
        try {
            // ref: .populate({ path: "coinID", models: "Coin" })
            const data = await BotModel.find().sort({ Created: -1 }).populate("userID", "userName");
            res.customResponse(res.statusCode, "Get All Bot Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getAllBotByUserID: async (req, res) => {
        try {
            const userID = req.params.id;

            // ref: .populate({ path: "coinID", models: "Coin" })
            const data = await BotModel.find({ userID }).sort({ Created: -1 }).populate("userID", "userName");
            res.customResponse(res.statusCode, "Get All Bot Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getAllBotBySameGroup: async (req, res) => {
        try {
            const groupID = req.params.id;

            const resultGetAllUsersID = await UserModel.find({ groupID }, { password: 0 }).select('_id');

            // ref: .populate({ path: "coinID", models: "Coin" })
            const data = await BotModel.find({ userID: { $in: resultGetAllUsersID } }).sort({ Created: -1 }).populate("userID", "userName");
            res.customResponse(res.statusCode, "Get All Bot Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    getByID: async (req, res) => {
        try {
            const botID = req.params.id;
            const data = await BotModel.findById(botID).sort({ Created: -1 });
            res.customResponse(res.statusCode, "Get Bot By ID Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    createBot: async (req, res) => {
        try {

            const userID = req.user._id

            const newBot = new BotModel({
                ...req.body,
                Created: new Date(),
                userID
            });

            const savedBot = await newBot.save();

            res.customResponse(res.statusCode, "Add New Bot Successful", savedBot);

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Add New Bot Error" });
        }
    },
    updateBot: async (req, res) => {
        try {

            const botID = req.params.id;

            const result = await BotModel.updateOne({ _id: botID }, { $set: req.body })

            if (result.acknowledged && result.matchedCount !== 0) {
                res.customResponse(200, "Update Bot Successful", "");
            }
            else {
                res.customResponse(400, "Update Bot failed", "");
            }

        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(500).json({ message: "Update Bot Error" });
        }
    },
    deleteBot: async (req, res) => {
        try {
            const botID = req.params.id;

            const result = await BotModel.deleteOne({ _id: botID })

            if (result.deletedCount !== 0) {
                res.customResponse(200, "Delete Bot Successful");
            }
            else {
                res.customResponse(400, "Delete Bot failed", "");
            }

        } catch (error) {
            res.status(500).json({ message: "Delete Bot Error" });
        }
    },
    deleteMultipleBot: async (req, res) => {
        try {
            const botIDList = req.body

            const result = await BotModel.deleteMany({ _id: { $in: botIDList } })

            if (result.deletedCount !== 0) {
                res.customResponse(200, "Delete Bot Successful");
            }
            else {
                res.customResponse(400, "Delete Bot failed", "");
            }

        } catch (error) {
            res.status(500).json({ message: "Delete Bot Error" });
        }
    },


}

module.exports = BotController 