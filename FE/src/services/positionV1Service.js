import api from "../utils/api"

export const getPriceLimitCurrent = async (symbol) => {
    return await api.post("/positionV1/getPriceLimitCurrent", {symbol})
}

export const getAllPosition = async (botListID) => {
    return await api.post("/positionV1/getAllPosition", { botListID })
}

export const updatePL = async (botListID) => {
    return await api.post("/positionV1/updatePL", { botListID })
}

export const closeMarket = async ({ positionData, Quantity }) => {
    return await api.post("/positionV1/closeMarket", { positionData, Quantity })
}
export const closeLimit = async ({ positionData, Quantity, Price }) => {
    return await api.post("/positionV1/closeLimit", { positionData, Quantity, Price })
}
export const closeAllPosition = async (botListID) => {
    return await api.post("/positionV1/closeAllPosition", { botListID })
}

