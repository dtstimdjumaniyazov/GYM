import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import * as SecureStore from 'expo-secure-store'

const BASE_URL = 'https://fitevolution.uz/api'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: async (headers) => {
      const token = await SecureStore.getItemAsync('access_token')
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  tagTypes: ['User', 'Courses', 'Enrollments', 'Favorites', 'Notifications'],
  endpoints: () => ({}),
})
