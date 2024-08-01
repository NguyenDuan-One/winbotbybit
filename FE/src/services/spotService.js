import api from "../utils/api"

// GET
export const getAllStrategiesSpot = async () => {
    return await api.get("/spot/getAllStrategiesSpot")
}
export const getAllSymbolSpot = async () => {
    return await api.get("/spot/getAllSymbolSpot")
}
export const getAllSymbolWith24 = async () => {
    return await api.get("/spot/getAllSymbolWith24")
}
export const getFutureAvailable = async (botID) => {
    return await api.get(`/spot/getFutureAvailable/${botID}`)
}

export const getTotalFutureByBot = async (userID) => {
    return await api.get(`/spot/getTotalFutureByBot/${userID}`)
}

export const getSpotTotal = async (botID) => {
    return await api.get(`/spot/getSpotTotal/${botID}`)
}

// CREATE
export const createStrategiesSpot = async (data) => {
    return await api.post("/spot/createStrategiesSpot", data)
}

// UPDATE
export const updateStrategiesByID = async ({ id, data }) => {
    return await api.put(`/spot/updateStrategies/${id}`, data)
}
export const updateStrategiesMultiple = async (data) => {
    return await api.post("/spot/updateStrategiesMultiple", data)
}

// DELETE
export const deleteStrategies = async (id) => {
    return await api.delete(`/spot/deleteStrategies/${id}`)
}
export const deleteStrategiesItem = async (data) => {
    return await api.post("/spot/deleteStrategiesItem", data)
}
export const deleteStrategiesMultiple = async (data) => {
    return await api.post("/spot/deleteStrategiesMultiple", data)
}

// OTHER
export const syncSymbolSpot = async () => {
    return await api.get("/spot/syncSymbolSpot")
}
export const copyMultipleStrategiesToSymbol = async (newData) => {
    return await api.post(`/spot/copyMultipleStrategiesToSymbol`, newData)
}
export const copyMultipleStrategiesToBot = async (newData) => {
    return await api.post(`/spot/copyMultipleStrategiesToBot`, newData)
}
export const balanceWallet = async (data) => {
    return await api.post("/spot/balanceWallet",data)
}
