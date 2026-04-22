import { apiSlice } from './apiSlice'

export const trainersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/users/trainers/
    getTrainers: builder.query({
      query: () => '/users/trainers/',
      providesTags: ['Trainer'],
    }),

    // GET /api/users/trainers/:id/
    getTrainer: builder.query({
      query: (id) => `/users/trainers/${id}/`,
      providesTags: (result, error, id) => [{ type: 'Trainer', id }],
    }),
  }),
})

export const {
  useGetTrainersQuery,
  useGetTrainerQuery,
} = trainersApi
