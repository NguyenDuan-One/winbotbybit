import { configureStore } from '@reduxjs/toolkit'
import toastSlice from './slices/Toast'
import breadcrumbsSlice from './slices/breadcrumbs'
import totalFutureSlice from './slices/TotalFuture'
import userDataSlice from './slices/UserData'
import loadingSlice from './slices/Loading'
import strategiesTempSlice from './slices/StrategiesTemp'

export default configureStore({
  reducer: {
    toastSlice:toastSlice,
    breadcrumbsSlice:breadcrumbsSlice,
    totalFutureSlice:totalFutureSlice,
    userDataSlice:userDataSlice,
    loadingSlice:loadingSlice,
    strategiesTempSlice:strategiesTempSlice,
  },
})