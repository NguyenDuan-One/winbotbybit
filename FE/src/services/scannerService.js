import api from "../utils/api"

// GET

export const getAllConfigScanner = async (botListInput) => {
    return await api.post("/scanner/getAllConfigScanner", { botListInput })
}


// CREATE
export const createConfigScanner = async (data) => {
    return await api.post("/scanner/createConfigScanner", data)
}


// OTHER
export const syncSymbolScanner = async () => {
    return await api.get("/scanner/syncSymbolScanner")
}
