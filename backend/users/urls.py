from django.urls import path
from users.views import (
    TrainerListView, TrainerDetailView,
    telegram_auth, telegram_widget_auth, google_auth,
    register, user_profile, user_profile_update,
    link_account, social_register, update_phone,
    SingleSessionTokenObtainPairView,
    SingleSessionTokenRefreshView,
    trainer_dashboard, trainer_courses,
    trainer_course_toggle_status, trainer_course_delete_request,
    trainer_profile_update,
    disconnect_telegram, disconnect_google,
    link_telegram_profile, link_google_profile,
    upload_avatar, delete_avatar,
    change_password,
)

app_name = 'users'

urlpatterns = [
    # Тренеры (публичный просмотр)
    path('trainers/', TrainerListView.as_view(), name='trainer-list'),
    path('trainers/<uuid:pk>/', TrainerDetailView.as_view(), name='trainer-detail'),

    # Авторизация
    path('auth/telegram/', telegram_auth, name='telegram-auth'),
    path('auth/telegram/callback/', telegram_widget_auth, name='telegram-widget-auth'),
    path('auth/google/', google_auth, name='google-auth'),
    path('auth/link/', link_account, name='link-account'),
    path('auth/social-register/', social_register, name='social-register'),
    path('register/', register, name='register'),
    path('token/', SingleSessionTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', SingleSessionTokenRefreshView.as_view(), name='token_refresh'),

    # Профиль
    path('profile/', user_profile, name='user-profile'),
    path('profile/update/', user_profile_update, name='user-profile-update'),
    path('profile/update-phone/', update_phone, name='update-phone'),
    path('profile/disconnect-telegram/', disconnect_telegram, name='disconnect-telegram'),
    path('profile/disconnect-google/', disconnect_google, name='disconnect-google'),
    path('profile/link-telegram/', link_telegram_profile, name='link-telegram-profile'),
    path('profile/link-google/', link_google_profile, name='link-google-profile'),
    path('profile/upload-avatar/', upload_avatar, name='upload-avatar'),
    path('profile/delete-avatar/', delete_avatar, name='delete-avatar'),
    path('profile/change-password/', change_password, name='change-password'),

    # Дашборд тренера
    path('trainer/dashboard/', trainer_dashboard, name='trainer-dashboard'),
    path('trainer/courses/', trainer_courses, name='trainer-courses'),
    path('trainer/courses/<uuid:pk>/toggle-status/', trainer_course_toggle_status, name='trainer-course-toggle-status'),
    path('trainer/courses/<uuid:pk>/request-delete/', trainer_course_delete_request, name='trainer-course-delete-request'),
    path('trainer/profile/update/', trainer_profile_update, name='trainer-profile-update'),
]
