import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQueryWithReauth } from './baseQuery'

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Trainers', 'TrainerDashboard', 'TrainerCourses'],
  endpoints: (builder) => ({
    // Telegram Mini App авторизация
    telegramLogin: builder.mutation({
      query: (initData) => ({
        url: '/users/auth/telegram/',
        method: 'POST',
        body: { init_data: initData },
      }),
    }),

    // Telegram Login Widget авторизация
    telegramWidgetLogin: builder.mutation({
      query: (telegramUser) => ({
        url: '/users/auth/telegram/callback/',
        method: 'POST',
        body: telegramUser,
      }),
    }),

    // Профиль
    getUserProfile: builder.query({
      query: () => '/users/profile/',
      providesTags: ['User'],
    }),

    updateUserProfile: builder.mutation({
      query: (profileData) => ({
        url: '/users/profile/update/',
        method: 'PUT',
        body: profileData,
      }),
      invalidatesTags: ['User'],
    }),

    // Регистрация
    registerUser: builder.mutation({
      query: (data) => ({
        url: '/users/register/',
        method: 'POST',
        body: data,
      }),
    }),

    // Google авторизация
    googleLogin: builder.mutation({
      query: (credential) => ({
        url: '/users/auth/google/',
        method: 'POST',
        body: { credential },
      }),
    }),

    // Привязка соц-аккаунта к существующему
    linkAccount: builder.mutation({
      query: ({ socialToken, phone, password }) => ({
        url: '/users/auth/link/',
        method: 'POST',
        body: { social_token: socialToken, phone, password },
      }),
    }),

    // Регистрация через соц-вход
    socialRegister: builder.mutation({
      query: ({ socialToken, phone, password, firstName, lastName }) => ({
        url: '/users/auth/social-register/',
        method: 'POST',
        body: {
          social_token: socialToken,
          phone,
          password,
          first_name: firstName,
          last_name: lastName,
        },
      }),
    }),

    // Обновление телефона (для legacy соц-аккаунтов)
    updatePhone: builder.mutation({
      query: ({ phone, password }) => ({
        url: '/users/profile/update-phone/',
        method: 'POST',
        body: { phone, password },
      }),
      invalidatesTags: ['User'],
    }),

    // Обновление токена
    refreshToken: builder.mutation({
      query: (refreshToken) => ({
        url: '/users/token/refresh/',
        method: 'POST',
        body: { refresh: refreshToken },
      }),
    }),

    // Тренеры
    getTrainers: builder.query({
      query: () => '/users/trainers/',
      providesTags: ['Trainers'],
    }),

    getTrainerDetail: builder.query({
      query: (id) => `/users/trainers/${id}/`,
      providesTags: ['Trainers'],
    }),

    // Дашборд тренера
    getTrainerDashboard: builder.query({
      query: () => '/users/trainer/dashboard/',
      providesTags: ['TrainerDashboard'],
    }),

    getTrainerCourses: builder.query({
      query: () => '/users/trainer/courses/',
      providesTags: ['TrainerCourses'],
    }),

    toggleCourseStatus: builder.mutation({
      query: (courseId) => ({
        url: `/users/trainer/courses/${courseId}/toggle-status/`,
        method: 'PATCH',
      }),
      invalidatesTags: ['TrainerCourses', 'TrainerDashboard'],
    }),

    requestCourseDeletion: builder.mutation({
      query: (courseId) => ({
        url: `/users/trainer/courses/${courseId}/request-delete/`,
        method: 'POST',
      }),
      invalidatesTags: ['TrainerCourses'],
    }),

    updateTrainerProfile: builder.mutation({
      query: (data) => ({
        url: '/users/trainer/profile/update/',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    // Отвязка соцсетей
    disconnectTelegram: builder.mutation({
      query: () => ({
        url: '/users/profile/disconnect-telegram/',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),

    disconnectGoogle: builder.mutation({
      query: () => ({
        url: '/users/profile/disconnect-google/',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),

    // Привязка соцсетей из профиля
    linkTelegramProfile: builder.mutation({
      query: (telegramData) => ({
        url: '/users/profile/link-telegram/',
        method: 'POST',
        body: telegramData,
      }),
      invalidatesTags: ['User'],
    }),

    linkGoogleProfile: builder.mutation({
      query: (credential) => ({
        url: '/users/profile/link-google/',
        method: 'POST',
        body: { credential },
      }),
      invalidatesTags: ['User'],
    }),

    // Аватар
    uploadAvatar: builder.mutation({
      query: (formData) => ({
        url: '/users/profile/upload-avatar/',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['User'],
    }),

    deleteAvatar: builder.mutation({
      query: () => ({
        url: '/users/profile/delete-avatar/',
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),

    changePassword: builder.mutation({
      query: (data) => ({
        url: '/users/profile/change-password/',
        method: 'POST',
        body: data,
      }),
    }),
  }),
})

export const {
  useTelegramLoginMutation,
  useTelegramWidgetLoginMutation,
  useRegisterUserMutation,
  useGoogleLoginMutation,
  useLinkAccountMutation,
  useSocialRegisterMutation,
  useUpdatePhoneMutation,
  useGetUserProfileQuery,
  useUpdateUserProfileMutation,
  useRefreshTokenMutation,
  useGetTrainersQuery,
  useGetTrainerDetailQuery,
  useGetTrainerDashboardQuery,
  useGetTrainerCoursesQuery,
  useToggleCourseStatusMutation,
  useRequestCourseDeletionMutation,
  useUpdateTrainerProfileMutation,
  useDisconnectTelegramMutation,
  useDisconnectGoogleMutation,
  useLinkTelegramProfileMutation,
  useLinkGoogleProfileMutation,
  useUploadAvatarMutation,
  useDeleteAvatarMutation,
  useChangePasswordMutation,
} = usersApi
