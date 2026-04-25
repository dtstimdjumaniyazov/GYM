import { configureStore } from '@reduxjs/toolkit'
import { apiSlice } from './api/apiSlice'
import { usersApi } from './api/usersApi'
import { notificationsApi } from './api/notificationsApi'

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(apiSlice.middleware)
      .concat(usersApi.middleware)
      .concat(notificationsApi.middleware),
})
