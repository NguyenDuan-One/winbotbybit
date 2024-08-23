import api from "../utils/api"

// GET
export const closeAllBotForUpCode = async () => {
    return await api.get("/dataCoinByBit/closeAllBotForUpCode")
}
export const getAllStrategies = async (botListInput) => {
    return await api.post("/dataCoinByBit/getAllStrategies", { botListInput })
}
export const getAllSymbol = async () => {
    return await api.get("/dataCoinByBit/getAllSymbol")
}

export const getFutureAvailable = async (botID) => {
    return await api.get(`/dataCoinByBit/getFutureAvailable/${botID}`)
}

export const getTotalFutureByBot = async (userID) => {
    return await api.get(`/dataCoinByBit/getTotalFutureByBot/${userID}`)
}
export const getTotalFutureSpot = async (userID) => {
    return await api.get(`/dataCoinByBit/getTotalFutureSpot/${userID}`)
}

export const getSpotTotal = async (botID) => {
    return await api.get(`/dataCoinByBit/getSpotTotal/${botID}`)
}

// CREATE
export const createStrategies = async (data) => {
    return await api.post("/dataCoinByBit/createStrategies", data)
}

// UPDATE
export const updateStrategiesByID = async ({ id, data }) => {
    return await api.put(`/dataCoinByBit/updateStrategies/${id}`, data)
}
export const updateStrategiesMultiple = async (data) => {
    return await api.post("/dataCoinByBit/updateStrategiesMultiple", data)
}
export const addToBookmark = async ({ symbolID }) => {
    return await api.put(`/dataCoinByBit/addToBookmark/${symbolID}`)
}
export const removeToBookmark = async ({ symbolID }) => {
    return await api.put(`/dataCoinByBit/removeToBookmark/${symbolID}`)
}

// DELETE
export const deleteStrategies = async (id,data) => {
    return await api.post(`/dataCoinByBit/deleteStrategies/${id}`,data)
}
export const deleteStrategiesItem = async (data) => {
    return await api.post("/dataCoinByBit/deleteStrategiesItem", data)
}
export const deleteStrategiesMultiple = async (data) => {
    return await api.post("/dataCoinByBit/deleteStrategiesMultiple", data)
}

// OTHER
export const syncSymbol = async () => {
    return await api.get("/dataCoinByBit/syncSymbol")
}
export const copyMultipleStrategiesToSymbol = async (newData) => {
    return await api.post(`/dataCoinByBit/copyMultipleStrategiesToSymbol`, newData)
}
export const copyMultipleStrategiesToBot = async (newData) => {
    return await api.post(`/dataCoinByBit/copyMultipleStrategiesToBot`, newData)
}
export const balanceWallet = async (data) => {
    return await api.post("/dataCoinByBit/balanceWallet", data)
}
