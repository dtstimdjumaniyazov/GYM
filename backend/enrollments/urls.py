from django.urls import path
from enrollments.views import (
    EnrollmentDetailView,
    ProgressView,
    SetVariantView,
    UserEnrollmentListView,
)

app_name = 'enrollments'

urlpatterns = [
    path('my/', UserEnrollmentListView.as_view(), name='user-enrollment-list'),
    path('<uuid:course_id>/', EnrollmentDetailView.as_view(), name='enrollment-detail'),
    path('<uuid:course_id>/set-variant/', SetVariantView.as_view(), name='set-variant'),
    path('<uuid:course_id>/progress/', ProgressView.as_view(), name='progress'),
]
