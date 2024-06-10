// const { ObjectId } = require('mongodb');
const RoleModel = require('../models/role.model');

const RoleController = {

    getByRoleName: async (req, res) => {
        try {
            const roleName = req.params.roleName;
            const data = await RoleModel.findOne({ name: roleName })
            res.customResponse(res.statusCode, "Get Role Successful", data);

        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
    initCreate: async (req, res) => {
        try {

            const listRoleDefault = [
                "Bots",
                "Strategies",
                "Coin",
                "Positions",
                "Order",
            ]

            const TraderRole = {
                name: "SuperAdmin",
                list: listRoleDefault
            }
            const ManagerTraderRole = {
                name: "SuperAdmin",
                list: [
                    ...TraderRole.list,
                    "Users"
                ]
            }
            const AdminRole = {
                name: "SuperAdmin",
                list: [
                    ...ManagerTraderRole.list,
                    "Groups"
                ]
            }
            const SuperAdminRole = {
                name: "SuperAdmin",
                list: [
                    ...AdminRole.list,
                    "BotTypes",
                ]
            }

            const roleList = [
                {
                    name: "SuperAdmin",
                    list: SuperAdminRole.list
                },
                {
                    name: "Admin",
                    list: AdminRole.list
                },
                {
                    name: "ManagerTrader",
                    list: ManagerTraderRole.list
                },
                {
                    name: "Trader",
                    list: TraderRole.list
                },
            ]
            const newData = roleList.map(role => ({
                name: role.name,
                roleList: role.list
            }))

            await RoleModel.insertMany(newData)

            if (res.statusCode === 200) {
                console.log("Initialization Role Successful");
            }
            else {
                console.log("Initialization Role Error");
            }

        } catch (error) {
            // Xử lý lỗi nếu có
        }
    },

}

module.exports = RoleController 