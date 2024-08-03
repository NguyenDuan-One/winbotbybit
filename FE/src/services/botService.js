import api from "../utils/api"

export const getAllBot = async () => {
    return await api.get("/bot/getAllBot")
}
export const getAllBotActive = async () => {
    return await api.get("/bot/getAllBotActive")
}
export const getAllBotByUserID = async (userID) => {
    return await api.get(`/bot/getAllBotByUserID/${userID}`)
}
export const getAllBotActiveByUserID = async (userID) => {
    return await api.get(`/bot/getAllBotActiveByUserID/${userID}`)
}
export const getAllBotOnlyApiKeyByUserID = async (userID) => {
    return await api.get(`/bot/getAllBotOnlyApiKeyByUserID/${userID}`)
}
export const getAllBotBySameGroup = async (groupID) => {
    return await api.get(`/bot/getAllBotBySameGroup/${groupID}`)
}
export const getBotByID = async (botID) => {
    return await api.get(`/bot/${botID}`)
}
export const createBot = async (data) => {
    return await api.post("/bot", data)
}
export const updateBot = async ({ id, data }) => {
    return await api.put(`/bot/${id}`, data)
}
export const deleteBot = async (botID) => {
    return await api.delete(`/bot/${botID}`)
}

export const deleteMultipleBot = async (botIDList) => {
    return await api.post(`/bot/deleteMultipleBot`,botIDList)
}
