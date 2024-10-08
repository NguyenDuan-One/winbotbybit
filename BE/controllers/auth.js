const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model')
// Tạo JWT token
const secretKey = process.env.JWT_SECRET_KEY;
const expiresIn = "8h"
const AuthController = {

    signUp: async (req, res) => {
        try {
            const { userName, password, roleName } = req.body;
            // Kiểm tra xem người dùng đã tồn tại chưa
            // const existingUser = await UserModel.findOne({ userName });
            // if (existingUser) {
            //     return res.customResponse(400, "UserName already exists", "");
            // }
            // Hash mật khẩu

            const hashedPassword = await bcrypt.hash(password, 10);
            // Tạo người dùng mới
            const newUser = new UserModel({ userName, password: hashedPassword, roleName: roleName ? roleName : "Trader" });

            const savedBot = await newUser.save();

            res.customResponse(res.statusCode, "Sign up Successful", savedBot);

        } catch (error) {
            // Xử lý lỗi nếu có
            if (error.code === 11000 && error.keyPattern && error.keyPattern.userName) {
                return res.customResponse(400, "UserName already exists", "");
            }
            res.customResponse(500, "Sign up Error", "");
        }
    },

    login: async (req, res) => {
        try {
            const { userName, password } = req.body;
            // Tìm người dùng trong database
            const user = await UserModel.findOne({ userName });
            if (!user) {
                return res.customResponse(400, "UserName Not Found", "");
            }
            else {
                const isActive = user.isActive
                if (isActive) {
                    // So sánh mật khẩu
                    const passwordMatch = await bcrypt.compare(password, user.password);

                    if (!passwordMatch) {
                        return res.customResponse(500, "UserName or Password not correct", "");
                    }
                    const userDataSign = {
                        userName: user.userName,
                        _id: user._id,
                    }

                    const token = jwt.sign(userDataSign, secretKey, { expiresIn: expiresIn });

                    res.customResponse(200, "Login Successful", {
                        token, user: userDataSign
                    });
                }
                else {
                    return res.customResponse(400, "UserName Is Not Active", "");
                }
            }


        } catch (error) {
            res.status(500).json({ message: 'Login Error' });
        }
    },

    loginSwitch: async (req, res) => {
        try {

            const { userName, userID } = req.body;

            const userDataSign = {
                userName,
                _id: userID
            }

            const token = jwt.sign(userDataSign, secretKey, { expiresIn: expiresIn });

            res.customResponse(200, "Switch User Successful", {
                token, user: userDataSign
            });

        } catch (error) {
            res.status(500).json({ message: 'Switch User Error' });
        }
    },

    verifyTokenVIP: async (req, res) => {

        const {token} = req.body;

        jwt.verify(token, secretKey, async (err, user) => {
            if (err) {
                return res.customResponse(400, "Your session has expired", "");
            }
            const result = await UserModel.findById(user._id)
            if (!result?.isActive) {
                return res.customResponse(400, "UserName Is Not Active", "");
            }
            return res.customResponse(200, "Verify VIP successful", user);
        });

    },

}

module.exports = AuthController 