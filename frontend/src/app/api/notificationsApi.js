import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithReauth } from './baseQuery'

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Notifications'],
  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: () => '/notifications/',
      providesTags: ['Notifications'],
    }),
    markAllRead: builder.mutation({
      query: () => ({ url: '/notifications/mark-all-read/', method: 'POST' }),
      invalidatesTags: ['Notifications'],
    }),
    markOneRead: builder.mutation({
      query: (id) => ({ url: `/notifications/${id}/read/`, method: 'PATCH' }),
      invalidatesTags: ['Notifications'],
    }),
    requestVerification: builder.mutation({
      query: () => ({ url: '/users/trainer/request-verification/', method: 'POST' }),
    }),
  }),
})

export const {
  useGetNotificationsQuery,
  useMarkAllReadMutation,
  useMarkOneReadMutation,
  useRequestVerificationMutation,
} = notificationsApi
