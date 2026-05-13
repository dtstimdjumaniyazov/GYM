export const API_URL = 'https://fitevolution.uz/api'

export const ENDPOINTS = {
  // Auth
  TOKEN: '/users/token/',
  TOKEN_REFRESH: '/users/token/refresh/',
  REGISTER: '/users/register/',
  TELEGRAM_AUTH: '/users/auth/telegram/',
  GOOGLE_AUTH: '/users/auth/google/',
  TELEGRAM_MOBILE_INIT: '/users/auth/telegram/mobile-init/',
  TELEGRAM_MOBILE_POLL: (state) => `/users/auth/telegram/mobile-poll/${state}/`,
  SOCIAL_LINK: '/users/auth/link/',
  SOCIAL_REGISTER: '/users/auth/social-register/',

  // Profile
  PROFILE: '/users/profile/',
  PROFILE_UPDATE: '/users/profile/update/',

  // Courses
  COURSES: '/courses/',
  COURSE_DETAIL: (id) => `/courses/${id}/`,
  CATEGORIES: '/courses/categories/',
  FAVORITES: '/courses/favorites/',
  FAVORITE_TOGGLE: (id) => `/courses/${id}/favorite/`,
  COURSE_LESSONS: (id) => `/courses/${id}/lessons/`,

  // Enrollments
  ENROLLMENTS: '/enrollments/my/',
  ENROLLMENT_DETAIL: (id) => `/enrollments/${id}/`,
  SET_VARIANT: (id) => `/enrollments/${id}/set-variant/`,
  PROGRESS: (id) => `/enrollments/${id}/progress/`,

  // Training
  TRAINING_SCHEDULE: (courseId) => `/training/${courseId}/schedule/`,

  // Trainers
  TRAINERS: '/users/trainers/',
  TRAINER_DETAIL: (id) => `/users/trainers/${id}/`,
  TRAINER_DASHBOARD: '/users/trainer/dashboard/',
  TRAINER_COURSES: '/users/trainer/courses/',
  TRAINER_PROFILE_UPDATE: '/users/trainer/profile/update/',

  // Notifications
  NOTIFICATIONS: '/notifications/',
  NOTIFICATIONS_MARK_ALL_READ: '/notifications/mark-all-read/',
  NOTIFICATION_MARK_READ: (id) => `/notifications/${id}/read/`,
}
