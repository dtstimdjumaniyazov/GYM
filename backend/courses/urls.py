from django.urls import path
from courses.views import (
    CategoryListView,
    CategoryDetailView,
    CourseListView,
    CourseDetailView,
    FavoriteToggleView,
    CourseLessonView,
    UserFavoritesListView,
    TrainerCourseListView,
    CourseCreateView,
    CourseUpdateView,
    CoursePublishView,
)

app_name = 'courses'

urlpatterns = [
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('categories/<slug:slug>/', CategoryDetailView.as_view(), name='category-detail'),
    path('favorites/', UserFavoritesListView.as_view(), name='user-favorites-list'),
    # Trainer management
    path('trainer/my/', TrainerCourseListView.as_view(), name='trainer-course-list'),
    path('trainer/', CourseCreateView.as_view(), name='trainer-course-create'),
    path('trainer/<uuid:pk>/', CourseUpdateView.as_view(), name='trainer-course-update'),
    path('trainer/<uuid:pk>/publish/', CoursePublishView.as_view(), name='trainer-course-publish'),
    # Public
    path('', CourseListView.as_view(), name='course-list'),
    path('<uuid:pk>/', CourseDetailView.as_view(), name='course-detail'),
    path('<uuid:pk>/favorite/', FavoriteToggleView.as_view(), name='course-favorite-toggle'),
    path('<uuid:pk>/lessons/', CourseLessonView.as_view(), name='course-lessons'),
]
