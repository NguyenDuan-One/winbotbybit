import api from "../utils/api"

// GET
export const getAllStrategies = async () => {
    return await api.get("/dataCoinByBit/getAllStrategies")
}
export const getAllSymbol = async () => {
    return await api.get("/dataCoinByBit/getAllSymbol")
}
export const getAllSymbolWith24 = async () => {
    return await api.get("/dataCoinByBit/getAllSymbolWith24")
}
export const getFutureAvailable = async (botID) => {
    return await api.get(`/dataCoinByBit/getFutureAvailable/${botID}`)
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

// DELETE
export const deleteStrategies = async (id) => {
    return await api.delete(`/dataCoinByBit/deleteStrategies/${id}`)
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
    return await api.post("/dataCoinByBit/balanceWallet",data)
}
