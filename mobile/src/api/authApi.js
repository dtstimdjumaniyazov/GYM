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
  useGetMeQuery,
  useUpdateMeMutation,
} = authApi
