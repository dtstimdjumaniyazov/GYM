import { baseApi } from './baseApi'

export const coursesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCategories: build.query({
      query: () => '/courses/categories/',
    }),
    getCourses: build.query({
      query: (params = {}) => ({
        url: '/courses/',
        params,
      }),
      transformResponse: (response) => response?.results ?? response,
      providesTags: ['Courses'],
    }),
    getCourse: build.query({
      query: (id) => `/courses/${id}/`,
      providesTags: ['Courses'],
    }),
    getCourseLessons: build.query({
      query: (id) => `/courses/${id}/lessons/`,
    }),
    toggleFavorite: build.mutation({
      query: (id) => ({
        url: `/courses/${id}/favorite/`,
        method: 'POST',
      }),
      invalidatesTags: ['Courses', 'Favorites'],
    }),
    getFavorites: build.query({
      query: () => '/courses/favorites/',
      providesTags: ['Favorites'],
    }),
    getEnrollments: build.query({
      query: () => '/enrollments/my/',
      providesTags: ['Enrollments'],
    }),
    getEnrollmentDetail: build.query({
      query: (courseId) => `/enrollments/my/${courseId}/`,
    }),
    setVariant: build.mutation({
      query: ({ courseId, variantId }) => ({
        url: `/enrollments/my/${courseId}/set-variant/`,
        method: 'POST',
        body: { variant_id: variantId },
      }),
    }),
    getTrainerCourses: build.query({
      query: () => '/courses/trainer/my/',
      providesTags: ['Courses'],
    }),
    getNotifications: build.query({
      query: () => '/notifications/',
      providesTags: ['Notifications'],
    }),
    markAllRead: build.mutation({
      query: () => ({
        url: '/notifications/mark-all-read/',
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),
  }),
})

export const {
  useGetCategoriesQuery,
  useGetCoursesQuery,
  useGetCourseQuery,
  useGetCourseLessonsQuery,
  useToggleFavoriteMutation,
  useGetFavoritesQuery,
  useGetEnrollmentsQuery,
  useGetEnrollmentDetailQuery,
  useSetVariantMutation,
  useGetTrainerCoursesQuery,
  useGetNotificationsQuery,
  useMarkAllReadMutation,
} = coursesApi
