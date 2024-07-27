import { configureStore } from '@reduxjs/toolkit'
import toastSlice from './slices/Toast'
import breadcrumbsSlice from './slices/breadcrumbs'
import totalFutureSlice from './slices/TotalFuture'
import userDataSlice from './slices/UserData'

export default configureStore({
  reducer: {
    toastSlice:toastSlice,
    breadcrumbsSlice:breadcrumbsSlice,
    totalFutureSlice:totalFutureSlice,
    userDataSlice:userDataSlice,
  },
})