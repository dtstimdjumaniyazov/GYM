import { baseApi } from './baseApi'

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation({
      query: ({ phone, password }) => ({
        url: '/users/token/',
        method: 'POST',
        body: { phone, password },
      }),
    }),
    register: build.mutation({
      query: (body) => ({
        url: '/users/register/',
        method: 'POST',
        body,
      }),
    }),
    googleAuth: build.mutation({
      query: (body) => ({
        url: '/users/auth/google/',
        method: 'POST',
        body,
      }),
    }),
    telegramWidgetAuth: build.mutation({
      query: (body) => ({
        url: '/users/auth/telegram/callback/',
        method: 'POST',
        body,
      }),
    }),
    linkAccount: build.mutation({
      query: (body) => ({
        url: '/users/auth/link/',
        method: 'POST',
        body,
      }),
    }),
    socialRegister: build.mutation({
      query: (body) => ({
        url: '/users/auth/social-register/',
        method: 'POST',
        body,
      }),
    }),
    getMe: build.query({
      query: () => '/users/profile/',
      providesTags: ['User'],
    }),
    updateMe: build.mutation({
      query: (body) => ({
        url: '/users/profile/update/',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['User'],
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useGoogleAuthMutation,
  useTelegramWidgetAuthMutation,
  useLinkAccountMutation,
  useSocialRegisterMutation,
  useGetMeQuery,
  useUpdateMeMutation,
} = authApi
