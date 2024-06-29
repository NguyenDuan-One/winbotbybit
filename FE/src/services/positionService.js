import api from "../utils/api"

export const getAllPosition = async (botListID) => {
    return await api.post("/position/getAllPosition", { botListID })
}

export const createPosition = async (data) => {
    return await api.post("/position/createPosition", data)
}

export const updatePosition = async (data) => {
    return await api.post("/position/updatePosition", data)
}

export const deletePosition = async (orderID) => {
    return await api.delete(`/position/deletePosition/${orderID}`)
}

