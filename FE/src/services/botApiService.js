import api from "../utils/api"

export const getBotApiByBotID = async (botID) => {
    return await api.get(`/botApi/getBotApiByBotID/${botID}`)
}
export const createBotApi = async (data) => {
    return await api.post("/botApi/create", data)
}

export const updateBotApi = async ({botApiID,data}) => {
    return await api.put(`/botApi/update/${botApiID}`, data)
}
