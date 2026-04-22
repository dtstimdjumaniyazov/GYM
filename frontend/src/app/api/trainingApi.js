import { apiSlice } from './apiSlice'

export const trainingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/training/:courseId/schedule/
    getTrainingSchedule: builder.query({
      query: (courseId) => `/training/${courseId}/schedule/`,
      providesTags: (result, error, courseId) => [
        { type: 'Enrollment', id: courseId },
      ],
    }),
  }),
})

export const {
  useGetTrainingScheduleQuery,
} = trainingApi
