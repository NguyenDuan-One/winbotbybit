import { createSlice } from '@reduxjs/toolkit'

const totalFutureSlice = createSlice({
    name: 'toast',
    initialState: {
        total: false,
    },
    reducers: {

        setTotalFuture: (state, action) => {
            const { total } = action.payload
            state.total = total
        },

    }
})

export const { setTotalFuture } = totalFutureSlice.actions
export default totalFutureSlice.reducer