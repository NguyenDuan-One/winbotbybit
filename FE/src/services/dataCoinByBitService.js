import api from "../utils/api"

export const getAllStrategies = async () => {
    return await api.get("/dataCoinByBit")
}
export const getAllSymbol = async () => {
    return await api.get("/dataCoinByBit/getAllSymbol")
}
export const syncSymbol = async () => {
    return await api.get("/dataCoinByBit/syncSymbol")
}
export const createStrategies = async (data) => {
    return await api.post("/dataCoinByBit/createStrategies",data)
}
export const updateStrategiesByID = async ({id,data}) => {
    return await api.put(`/dataCoinByBit/updateStrategies/${id}`,data)
}
export const updateStrategiesMultiple = async (data) => {
    return await api.post("/dataCoinByBit/updateStrategiesMultiple",data)
}
export const deleteStrategies = async (id) => {
    return await api.delete(`/dataCoinByBit/deleteStrategies/${id}`)
}
export const deleteStrategiesItem = async (data) => {
    return await api.post("/dataCoinByBit/deleteStrategiesItem",data)
}

export const deleteStrategiesMultiple = async (data) => {
    return await api.post("/dataCoinByBit/deleteStrategiesMultiple",data)
}