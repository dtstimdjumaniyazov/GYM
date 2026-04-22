import { configureStore } from '@reduxjs/toolkit'
import { apiSlice } from './api/apiSlice'
import { usersApi } from './api/usersApi'

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(apiSlice.middleware)
      .concat(usersApi.middleware),
})
