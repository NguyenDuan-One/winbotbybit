import api from "../utils/api"

// GET

export const getAllCoin = async () => {
    return await api.get("/coin/getAllCoin")
}

// OTHER
export const syncCoin = async () => {
    return await api.get("/coin/syncCoin")
}
