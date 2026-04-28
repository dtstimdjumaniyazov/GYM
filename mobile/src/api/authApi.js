import { baseApi } from './baseApi'

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    requestOtp: build.mutation({
      query: (phone) => ({
        url: '/users/request-otp/',
        method: 'POST',
        body: { phone },
      }),
    }),
    verifyOtp: build.mutation({
      query: (body) => ({
        url: '/users/verify-otp/',
        method: 'POST',
        body,
      }),
    }),
    getMe: build.query({
      query: () => '/users/me/',
      providesTags: ['User'],
    }),
    updateMe: build.mutation({
      query: (body) => ({
        url: '/users/me/',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['User'],
    }),
  }),
})

export const {
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useGetMeQuery,
  useUpdateMeMutation,
} = authApi
