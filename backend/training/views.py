from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from courses.permissions import IsTrainer
from enrollments.models import Enrollment
from training.models import TrainingVariant
from training.serializers import (
    TrainingVariantDetailSerializer,
    TrainingVariantWriteSerializer,
)


class CourseTrainingContentView(APIView):
    """
    GET — training schedule for a course.
    - Authenticated + enrolled + variant locked → full schedule for chosen variant
    - Otherwise → empty (training content requires purchase + variant selection)
    """
    permission_classes = [AllowAny]

    def get(self, request, course_id):
        enrollment = None
        if request.user.is_authenticated:
            enrollment = Enrollment.objects.filter(
                user=request.user,
                course_id=course_id,
                is_active=True,
            ).select_related('variant').first()

        if enrollment and enrollment.variant_locked and enrollment.variant:
            variant = (
                TrainingVariant.objects
                .filter(pk=enrollment.variant_id)
                .prefetch_related(
                    'weeks__days__contents__vimeo_video',
                    'weeks__days__contents__gdrive_file',
                )
                .first()
            )
            if variant:
                serializer = TrainingVariantDetailSerializer(variant)
                return Response({
                    'course_id': str(course_id),
                    'is_enrolled': True,
                    'variant_locked': True,
                    'variant': serializer.data,
                })

        return Response({
            'course_id': str(course_id),
            'is_enrolled': enrollment is not None,
            'variant_locked': enrollment.variant_locked if enrollment else False,
            'variant': None,
        })


# ─── Trainer: save/update training variant ────────────────────

class TrainingVariantCreateView(generics.CreateAPIView):
    """
    POST /api/training/variants/
    Создаёт вариант тренировок с вложенными неделями/днями/контентом.
    """
    serializer_class = TrainingVariantWriteSerializer
    permission_classes = [IsAuthenticated, IsTrainer]

    def perform_create(self, serializer):
        # Проверяем что тренер является владельцем курса
        course = serializer.validated_data['course']
        trainer = self.request.user.trainer_profile
        if course.trainer != trainer:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Вы не являетесь тренером этого курса.')
        serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        instance = serializer.instance
        read_serializer = TrainingVariantDetailSerializer(
            TrainingVariant.objects
            .prefetch_related('weeks__days__contents__vimeo_video', 'weeks__days__contents__gdrive_file')
            .get(pk=instance.pk)
        )
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)


class TrainingVariantUpdateView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/training/variants/<uuid:pk>/ — получить вариант
    PUT    /api/training/variants/<uuid:pk>/ — полная замена варианта
    PATCH  /api/training/variants/<uuid:pk>/ — частичное обновление
    DELETE /api/training/variants/<uuid:pk>/ — удалить вариант
    """
    permission_classes = [IsAuthenticated, IsTrainer]

    def get_queryset(self):
        trainer = self.request.user.trainer_profile
        return TrainingVariant.objects.filter(course__trainer=trainer)

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return TrainingVariantDetailSerializer
        return TrainingVariantWriteSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        read_serializer = TrainingVariantDetailSerializer(
            TrainingVariant.objects
            .prefetch_related('weeks__days__contents__vimeo_video', 'weeks__days__contents__gdrive_file')
            .get(pk=instance.pk)
        )
        return Response(read_serializer.data)
