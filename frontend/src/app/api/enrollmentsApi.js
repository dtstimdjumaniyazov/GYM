import { apiSlice } from './apiSlice'

export const enrollmentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/enrollments/my/?page=
    getUserEnrollments: builder.query({
      query: ({ page = 1 } = {}) => `/enrollments/my/?page=${page}`,
      providesTags: ['Enrollment'],
    }),

    // GET /api/enrollments/:courseId/
    getEnrollment: builder.query({
      query: (courseId) => `/enrollments/${courseId}/`,
      providesTags: (result, error, courseId) => [
        { type: 'Enrollment', id: courseId },
      ],
    }),

    // POST /api/enrollments/:courseId/set-variant/
    setVariant: builder.mutation({
      query: ({ courseId, variantId }) => ({
        url: `/enrollments/${courseId}/set-variant/`,
        method: 'POST',
        body: { variant_id: variantId },
      }),
      invalidatesTags: (result, error, { courseId }) => [
        { type: 'Enrollment', id: courseId },
      ],
    }),

    // GET /api/enrollments/:courseId/progress/
    getProgress: builder.query({
      query: (courseId) => `/enrollments/${courseId}/progress/`,
      providesTags: (result, error, courseId) => [
        { type: 'Progress', id: courseId },
      ],
    }),

    // POST /api/enrollments/:courseId/progress/
    updateProgress: builder.mutation({
      query: ({ courseId, ...body }) => ({
        url: `/enrollments/${courseId}/progress/`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { courseId }) => [
        'Enrollment',
        { type: 'Progress', id: courseId },
      ],
      // Optimistic update — обновляем кэш getProgress без рефетча
      async onQueryStarted({ courseId, content_id, content_type, watch_percent }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          enrollmentsApi.util.updateQueryData('getProgress', courseId, (draft) => {
            const existing = draft.find(
              (p) => p.content_id === content_id && p.content_type === content_type,
            )
            if (existing) {
              if (watch_percent > existing.watch_percent) {
                existing.watch_percent = watch_percent
                if (watch_percent >= 90) existing.is_completed = true
              }
            } else {
              draft.push({
                content_id,
                content_type,
                watch_percent,
                is_completed: watch_percent >= 90,
                completed_at: null,
              })
            }
          }),
        )
        try {
          await queryFulfilled
        } catch (err) {
          patch.undo()
          console.error('[updateProgress] failed:', content_id, content_type, err)
        }
      },
    }),
  }),
})

export const {
  useGetUserEnrollmentsQuery,
  useGetEnrollmentQuery,
  useSetVariantMutation,
  useGetProgressQuery,
  useUpdateProgressMutation,
} = enrollmentsApi
