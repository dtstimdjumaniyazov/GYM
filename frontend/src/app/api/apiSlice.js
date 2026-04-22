import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithReauth } from './baseQuery'

export const apiSlice = createApi({
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Trainer', 'Course', 'Category', 'Enrollment', 'Favorite', 'User', 'Progress', 'TrainingVariant'],
  endpoints: () => ({}),
})
