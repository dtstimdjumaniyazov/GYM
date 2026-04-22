import { apiSlice } from './apiSlice'

export const coursesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /api/courses/?page=&category=&trainer=
    getCourses: builder.query({
      query: ({ page = 1, category, trainer } = {}) => {
        const params = new URLSearchParams()
        params.set('page', page)
        if (category) params.set('category', category)
        if (trainer) params.set('trainer', trainer)
        return `/courses/?${params}`
      },
      providesTags: ['Course', 'Favorite'],
    }),

    // GET /api/courses/:id/ — detail with modules, trainer, variants
    getCourse: builder.query({
      query: (id) => `/courses/${id}/`,
      providesTags: (result, error, id) => [
        { type: 'Course', id },
        { type: 'Favorite', id },
      ],
    }),

    // GET /api/courses/categories/
    getCategories: builder.query({
      query: () => '/courses/categories/',
      providesTags: ['Category'],
    }),

    // GET /api/courses/categories/:slug/
    getCategory: builder.query({
      query: (slug) => `/courses/categories/${slug}/`,
      providesTags: (result, error, slug) => [{ type: 'Category', id: slug }],
    }),

    // POST /api/courses/:id/favorite/ — toggle favorite
    toggleFavorite: builder.mutation({
      query: (id) => ({
        url: `/courses/${id}/favorite/`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Course', id },
        { type: 'Favorite', id },
        'Favorite',
      ],
    }),

    // GET /api/courses/:id/lessons/ — module content
    getCourseLessons: builder.query({
      query: (id) => `/courses/${id}/lessons/`,
      providesTags: (result, error, id) => [{ type: 'Course', id }],
    }),

    // GET /api/courses/favorites/?page=
    getUserFavorites: builder.query({
      query: ({ page = 1 } = {}) => `/courses/favorites/?page=${page}`,
      providesTags: ['Favorite'],
    }),
  }),
})

export const {
  useGetCoursesQuery,
  useGetCourseQuery,
  useGetCategoriesQuery,
  useGetCategoryQuery,
  useToggleFavoriteMutation,
  useGetCourseLessonsQuery,
  useGetUserFavoritesQuery,
} = coursesApi
