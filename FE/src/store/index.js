import { configureStore } from '@reduxjs/toolkit'
import toastSlice from './slices/Toast'
import breadcrumbsSlice from './slices/breadcrumbs'

export default configureStore({
  reducer: {
    toastSlice:toastSlice,
    breadcrumbsSlice:breadcrumbsSlice,
  },
})