import api from "../utils/api"

export const getPriceLimitCurrent = async (symbol) => {
    return await api.post("/position/getPriceLimitCurrent", {symbol})
}

export const getAllPosition = async (botListID) => {
    return await api.post("/position/getAllPosition", { botListID })
}

export const updatePL = async (botListID) => {
    return await api.post("/position/updatePL", { botListID })
}

export const closeMarket = async ({ positionData, Quantity }) => {
    return await api.post("/position/closeMarket", { positionData, Quantity })
}
export const closeLimit = async ({ positionData, Quantity, Price }) => {
    return await api.post("/position/closeLimit", { positionData, Quantity, Price })
}


