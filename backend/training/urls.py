from django.urls import path
from training.views import (
    CourseTrainingContentView,
    TrainingVariantCreateView,
    TrainingVariantUpdateView,
)

app_name = 'training'

urlpatterns = [
    path('<uuid:course_id>/schedule/', CourseTrainingContentView.as_view(), name='training-schedule'),
    path('variants/', TrainingVariantCreateView.as_view(), name='variant-create'),
    path('variants/<uuid:pk>/', TrainingVariantUpdateView.as_view(), name='variant-detail'),
]
