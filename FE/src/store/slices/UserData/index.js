import { createSlice } from '@reduxjs/toolkit'

const userDataSlice = createSlice({
    name: 'toast',
    initialState: {
        userData: {
            "_id": "",
            "userName": "",
            "roleName": "",
            "isActive": false,
        },
    },
    reducers: {

        setUserDataLocal: (state, action) => {
            state.userData = action.payload
        },

    }
})

export const { setUserDataLocal } = userDataSlice.actions
export default userDataSlice.reducer