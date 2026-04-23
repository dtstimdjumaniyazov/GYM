from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Exists, OuterRef, Q

from courses.models import Category, Course, CourseModule, Favorite
from courses.permissions import IsTrainer
from courses.serializers import (
    CategoryCardSerializer,
    CourseCardSerializer,
    CourseDetailSerializer,
    CourseModuleSerializer,
    CourseCreateSerializer,
    CourseTrainerDetailSerializer,
)


class CategoryListView(generics.ListAPIView):
    """Список всех активных категорий."""
    queryset = Category.objects.filter(is_active=True).order_by('order', 'title')
    serializer_class = CategoryCardSerializer
    pagination_class = None


class CategoryDetailView(generics.RetrieveAPIView):
    """Детальная информация о категории."""
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategoryCardSerializer
    lookup_field = 'slug'


class CourseListView(generics.ListAPIView):
    """Список всех опубликованных курсов."""
    serializer_class = CourseCardSerializer

    def get_queryset(self):
        qs = Course.objects.filter(
            status=Course.Status.PUBLISHED,
        ).select_related('trainer__user', 'category')

        # Фильтр по категории
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category_id=category)

        # Фильтр по тренеру
        trainer = self.request.query_params.get('trainer')
        if trainer:
            qs = qs.filter(trainer_id=trainer)

        if self.request.user.is_authenticated:
            qs = qs.annotate(
                _is_favorited=Exists(
                    Favorite.objects.filter(
                        user=self.request.user, course=OuterRef('pk')
                    )
                ),
            )
        return qs


class CourseDetailView(generics.RetrieveAPIView):
    """Детальная информация о курсе.

    Опубликованные курсы видны всем.
    Снятые с публикации — только купившим пользователям.
    """
    serializer_class = CourseDetailSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = (
            Course.objects
            .select_related('trainer__user', 'category')
            .prefetch_related(
                'modules__contents__vimeo_video',
                'modules__contents__gdrive_file',
                'training_variants__weeks__days__contents__vimeo_video',
                'training_variants__weeks__days__contents__gdrive_file',
                'training_variants',
                'enrollments',
                'favorited_by',
            )
        )
        q = Q(status=Course.Status.PUBLISHED)
        if self.request.user.is_authenticated:
            q |= Q(enrollments__user=self.request.user, enrollments__is_active=True)
            if hasattr(self.request.user, 'trainer_profile'):
                q |= Q(trainer=self.request.user.trainer_profile)
        return qs.filter(q).distinct()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class FavoriteToggleView(APIView):
    """POST — toggle favorite on/off for a course."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            course = Course.objects.get(pk=pk, status=Course.Status.PUBLISHED)
        except Course.DoesNotExist:
            return Response(
                {'detail': 'Курс не найден.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        favorite, created = Favorite.objects.get_or_create(
            user=request.user, course=course
        )
        if not created:
            favorite.delete()
            return Response({'is_favorited': False})
        return Response({'is_favorited': True}, status=status.HTTP_201_CREATED)


class UserFavoritesListView(generics.ListAPIView):
    """GET /api/courses/favorites/ — избранные курсы текущего пользователя."""
    serializer_class = CourseCardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Course.objects
            .filter(
                favorited_by__user=self.request.user,
                status=Course.Status.PUBLISHED,
            )
            .select_related('trainer__user')
        )


class CourseLessonView(APIView):
    """
    GET — module content for a course.
    Authenticated + enrolled users get all content.
    Others get only is_preview=True content.

    Снятый с публикации курс доступен только купившим.
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            q = Q(status=Course.Status.PUBLISHED)
            if request.user.is_authenticated:
                q |= Q(enrollments__user=request.user, enrollments__is_active=True)
            course = (
                Course.objects
                .filter(q)
                .prefetch_related(
                    'modules__contents__vimeo_video',
                    'modules__contents__gdrive_file',
                )
                .distinct()
                .get(pk=pk)
            )
        except Course.DoesNotExist:
            return Response(
                {'detail': 'Курс не найден.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        is_enrolled = False
        if request.user.is_authenticated:
            is_enrolled = course.enrollments.filter(
                user=request.user, is_active=True
            ).exists()

        modules = course.modules.filter(is_filled=True).order_by('-priority')
        result = []
        for module in modules:
            data = CourseModuleSerializer(module).data
            if not is_enrolled:
                data['contents'] = [
                    c for c in data['contents'] if c['is_preview']
                ]
            result.append(data)

        return Response({
            'course_id': str(course.id),
            'is_enrolled': is_enrolled,
            'modules': result,
        })


# ─── Trainer course management ─────────────────────────────────

class TrainerCourseListView(generics.ListAPIView):
    """GET /api/courses/trainer/my/ — курсы текущего тренера (все статусы)."""
    serializer_class = CourseCardSerializer
    permission_classes = [IsAuthenticated, IsTrainer]

    def get_queryset(self):
        trainer = self.request.user.trainer_profile
        return (
            Course.objects
            .filter(trainer=trainer)
            .select_related('trainer__user', 'category')
            .order_by('-created_at')
        )


class CourseCreateView(generics.CreateAPIView):
    """POST /api/courses/trainer/ — создать курс (черновик)."""
    serializer_class = CourseCreateSerializer
    permission_classes = [IsAuthenticated, IsTrainer]

    def perform_create(self, serializer):
        trainer = self.request.user.trainer_profile
        serializer.save(trainer=trainer, status=Course.Status.DRAFT)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        course = serializer.instance
        return Response(
            CourseTrainerDetailSerializer(course).data,
            status=status.HTTP_201_CREATED,
        )


class CourseUpdateView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/courses/trainer/<uuid:pk>/ — детали курса для тренера
    PATCH /api/courses/trainer/<uuid:pk>/ — обновить курс
    """
    serializer_class = CourseCreateSerializer
    permission_classes = [IsAuthenticated, IsTrainer]

    def get_queryset(self):
        trainer = self.request.user.trainer_profile
        return Course.objects.filter(trainer=trainer)

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return CourseTrainerDetailSerializer
        return CourseCreateSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CourseTrainerDetailSerializer(instance).data)


class CoursePublishView(APIView):
    """POST /api/courses/trainer/<uuid:pk>/publish/

    action='publish'  → переводит курс на модерацию (PENDING_REVIEW).
                        Администратор затем подтверждает публикацию.
    action='unpublish' → снимает курс с публикации (DRAFT).
                         Доступ уже купивших пользователей сохраняется.
    """
    permission_classes = [IsAuthenticated, IsTrainer]

    def post(self, request, pk):
        trainer = request.user.trainer_profile
        try:
            course = Course.objects.get(pk=pk, trainer=trainer)
        except Course.DoesNotExist:
            return Response({'detail': 'Курс не найден'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action', 'publish')
        if action == 'publish':
            if course.status == Course.Status.PUBLISHED:
                return Response(
                    {'detail': 'Курс уже опубликован.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            course.status = Course.Status.PENDING_REVIEW
        else:
            course.status = Course.Status.DRAFT
        course.save()
        return Response({'status': course.status})
