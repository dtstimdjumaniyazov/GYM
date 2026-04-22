from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.exceptions import ValidationError
from django.db.models import Q

from enrollments.models import Enrollment, LessonProgress
from enrollments.serializers import (
    EnrollmentSerializer,
    LessonProgressSerializer,
    SetVariantSerializer,
    UpdateProgressSerializer,
    UserEnrollmentCardSerializer,
)
from training.models import TrainingVariant


class UserEnrollmentListView(generics.ListAPIView):
    """GET /api/enrollments/my/ — список покупок текущего пользователя."""
    serializer_class = UserEnrollmentCardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Enrollment.objects
            .filter(user=self.request.user, is_active=True)
            .select_related('course__trainer__user', 'variant')
            .prefetch_related('progress_items')
            .order_by('-created_at')
        )


class EnrollmentDetailView(APIView):
    """GET — enrollment status for a user + course."""
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        try:
            enrollment = Enrollment.objects.select_related('variant').get(
                user=request.user, course_id=course_id, is_active=True
            )
        except Enrollment.DoesNotExist:
            return Response(
                {'detail': 'Покупка не найдена.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = EnrollmentSerializer(enrollment)
        return Response(serializer.data)


class SetVariantView(APIView):
    """POST — set training variant for an enrollment (one-time only)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        try:
            enrollment = Enrollment.objects.get(
                user=request.user, course_id=course_id, is_active=True
            )
        except Enrollment.DoesNotExist:
            return Response(
                {'detail': 'Покупка не найдена.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = SetVariantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            variant = TrainingVariant.objects.get(
                pk=serializer.validated_data['variant_id']
            )
            enrollment.set_variant(variant)
        except TrainingVariant.DoesNotExist:
            return Response(
                {'detail': 'Вариант не найден.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValidationError as e:
            return Response(
                {'detail': str(e.message)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(EnrollmentSerializer(enrollment).data)


class ProgressView(APIView):
    """
    GET  — список прогрессов для enrollment по курсу.
    POST — сохранить / обновить прогресс контента.
    """
    permission_classes = [IsAuthenticated]

    def _get_enrollment(self, request, course_id):
        try:
            return Enrollment.objects.get(
                user=request.user, course_id=course_id, is_active=True
            )
        except Enrollment.DoesNotExist:
            return None

    def get(self, request, course_id):
        enrollment = self._get_enrollment(request, course_id)
        if not enrollment:
            return Response(
                {'detail': 'Покупка не найдена.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        progress = LessonProgress.objects.filter(enrollment=enrollment)
        return Response(LessonProgressSerializer(progress, many=True).data)

    def post(self, request, course_id):
        enrollment = self._get_enrollment(request, course_id)
        if not enrollment:
            return Response(
                {'detail': 'Покупка не найдена.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UpdateProgressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        progress, _ = LessonProgress.objects.get_or_create(
            enrollment=enrollment,
            content_id=data['content_id'],
            content_type=data['content_type'],
        )

        watch_percent = data['watch_percent']
        if watch_percent > progress.watch_percent:
            progress.watch_percent = watch_percent
            if watch_percent >= 90 and not progress.is_completed:
                progress.mark_completed()
            else:
                progress.save(update_fields=['watch_percent', 'updated_at'])

        return Response(LessonProgressSerializer(progress).data)
