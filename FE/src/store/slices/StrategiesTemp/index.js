import { createSlice } from '@reduxjs/toolkit'

const strategiesTempSlice = createSlice({
    name: 'StrategiesTemp',
    initialState: {
        dataList:[]
    },
    reducers: {

        setStrategiesTempData: (state, action) => {
            state.dataList = action.payload
        },

    }
})

export const { setStrategiesTempData } = strategiesTempSlice.actions
export default strategiesTempSlice.reducer