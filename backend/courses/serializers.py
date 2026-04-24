from rest_framework import serializers
from courses.models import Category, Course, CourseModule, ModuleContent, Favorite
from storage.models import VimeoVideo, GoogleDriveFile
from users.models import Trainer
from training.models import TrainingVariant
from core.i18n import get_lang, loc


# ─── Card serializers (for listing) ───────────────────────────

class CategoryCardSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id',
            'title',
            'slug',
            'description',
            'icon_url',
            'order',
            'is_active',
        ]

    def get_title(self, obj):
        return loc(obj, 'title', get_lang(self.context.get('request')))

    def get_description(self, obj):
        return loc(obj, 'description', get_lang(self.context.get('request')))


class CourseCardSerializer(serializers.ModelSerializer):
    trainer_name = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()
    variants_count = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'trainer', 'trainer_name', 'category', 'title', 'cover_url', 'level',
            'format', 'target_weight_range', 'language', 'price',
            'duration_weeks', 'purchases_count', 'rating', 'status', 'is_favorited',
            'variants_count',
        ]

    def get_title(self, obj):
        return loc(obj, 'title', get_lang(self.context.get('request')))

    def get_trainer_name(self, obj):
        return obj.trainer.user.full_name or str(obj.trainer.user.phone)

    def get_variants_count(self, obj):
        return obj.training_variants.count()

    def get_is_favorited(self, obj):
        # Use annotation if available (avoids N+1)
        if hasattr(obj, '_is_favorited'):
            return obj._is_favorited
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return Favorite.objects.filter(user=request.user, course=obj).exists()


# ─── Nested serializers (for detail) ──────────────────────────

class VimeoVideoSerializer(serializers.ModelSerializer):
    duration_formatted = serializers.CharField(read_only=True)

    class Meta:
        model = VimeoVideo
        fields = [
            'id', 'vimeo_id', 'title', 'duration_seconds',
            'duration_formatted', 'thumbnail_url', 'playback_url',
        ]


class GoogleDriveFileSerializer(serializers.ModelSerializer):
    file_size_formatted = serializers.CharField(read_only=True)

    class Meta:
        model = GoogleDriveFile
        fields = [
            'id', 'gdrive_id', 'filename', 'mime_type',
            'file_size_formatted', 'view_url',
        ]


class ModuleContentSerializer(serializers.ModelSerializer):
    vimeo_video = VimeoVideoSerializer(read_only=True)
    gdrive_file = GoogleDriveFileSerializer(read_only=True)
    title = serializers.SerializerMethodField()

    class Meta:
        model = ModuleContent
        fields = [
            'id', 'title', 'order', 'content_type',
            'is_preview', 'vimeo_video', 'gdrive_file',
        ]

    def get_title(self, obj):
        return loc(obj, 'title', get_lang(self.context.get('request')))


class CourseModuleSerializer(serializers.ModelSerializer):
    contents = ModuleContentSerializer(many=True, read_only=True)

    class Meta:
        model = CourseModule
        fields = [
            'id', 'type', 'priority', 'is_primary',
            'is_filled', 'contents',
        ]


class TrainerNestedSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)

    class Meta:
        model = Trainer
        fields = [
            'id', 'first_name', 'last_name', 'photo_url',
            'specialization', 'experience_years', 'certificates',
            'bio', 'short_description',
        ]


class TrainingVariantBriefSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()

    class Meta:
        model = TrainingVariant
        fields = ['id', 'variant_number', 'name', 'description']

    def get_name(self, obj):
        return loc(obj, 'name', get_lang(self.context.get('request')))

    def get_description(self, obj):
        return loc(obj, 'description', get_lang(self.context.get('request')))


# ─── Write serializers (trainer course creation) ──────────────

class CourseModuleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseModule
        fields = ['type', 'priority']


class CourseCreateSerializer(serializers.ModelSerializer):
    modules = CourseModuleWriteSerializer(many=True, required=False, write_only=True)

    class Meta:
        model = Course
        fields = [
            'category',
            'title', 'short_description', 'full_description',
            'level', 'format', 'equipment', 'target_weight_range',
            'language', 'price', 'duration_weeks',
            'requirements', 'goals_text', 'modules',
        ]

    def create(self, validated_data):
        modules_data = validated_data.pop('modules', [])
        course = Course.objects.create(**validated_data)
        for module_data in modules_data:
            module_data['is_filled'] = False
            CourseModule.objects.create(course=course, **module_data)
        return course

    def update(self, instance, validated_data):
        modules_data = validated_data.pop('modules', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if modules_data is not None:
            existing = {m.type: m for m in instance.modules.all()}
            new_types = {m['type'] for m in modules_data}
            for t, m in existing.items():
                if t not in new_types:
                    m.delete()
            for module_data in modules_data:
                t = module_data['type']
                if t in existing:
                    existing[t].priority = module_data['priority']
                    existing[t].save()
                else:
                    CourseModule.objects.create(course=instance, is_filled=False, **module_data)
        return instance


class CourseTrainerDetailSerializer(serializers.ModelSerializer):
    """Детали курса для тренера (включает черновики)."""
    modules = CourseModuleSerializer(many=True, read_only=True)
    training_variants = serializers.SerializerMethodField()
    category = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Course
        fields = [
            'id', 'category', 'title', 'short_description', 'full_description',
            'level', 'format', 'equipment', 'target_weight_range',
            'language', 'price', 'duration_weeks',
            'requirements', 'goals_text', 'status',
            'cover_url', 'created_at', 'updated_at',
            'modules', 'training_variants',
        ]

    def get_training_variants(self, obj):
        from training.serializers import TrainingVariantDetailSerializer
        qs = obj.training_variants.prefetch_related(
            'weeks__days__contents__vimeo_video',
            'weeks__days__contents__gdrive_file',
        ).order_by('variant_number')
        return TrainingVariantDetailSerializer(qs, many=True).data


# ─── Course Detail serializer ─────────────────────────────────

class CourseDetailSerializer(serializers.ModelSerializer):
    trainer = TrainerNestedSerializer(read_only=True)
    modules = serializers.SerializerMethodField()
    training_variants = TrainingVariantBriefSerializer(
        many=True, read_only=True
    )
    is_purchased = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()
    trainer_name = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    short_description = serializers.SerializerMethodField()
    full_description = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'trainer', 'trainer_name', 'category',
            'title', 'cover_url', 'short_description', 'full_description',
            'level', 'format', 'equipment', 'target_weight_range',
            'language', 'price', 'duration_weeks',
            'requirements', 'goals_text',
            'purchases_count', 'rating', 'status',
            'created_at', 'updated_at', 'published_at',
            'modules', 'training_variants',
            'is_purchased', 'is_favorited', 'stats',
        ]

    def get_title(self, obj):
        return loc(obj, 'title', get_lang(self.context.get('request')))

    def get_short_description(self, obj):
        return loc(obj, 'short_description', get_lang(self.context.get('request')))

    def get_full_description(self, obj):
        return loc(obj, 'full_description', get_lang(self.context.get('request')))

    def get_trainer_name(self, obj):
        return obj.trainer.user.full_name or str(obj.trainer.user.phone)

    def get_is_purchased(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.enrollments.filter(
            user=request.user, is_active=True
        ).exists()

    def get_is_favorited(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return Favorite.objects.filter(
            user=request.user, course=obj
        ).exists()

    def get_modules(self, obj):
        """Return only filled modules. Filter content by purchase status."""
        request = self.context.get('request')
        is_purchased = self.get_is_purchased(obj)

        filled_modules = obj.modules.filter(is_filled=True).order_by('-priority')
        result = []
        for module in filled_modules:
            module_data = CourseModuleSerializer(module).data
            if not is_purchased:
                # Show only preview content for non-purchased users
                module_data['contents'] = [
                    c for c in module_data['contents'] if c['is_preview']
                ]
            result.append(module_data)
        return result

    def get_stats(self, obj):
        """Aggregate content stats across all filled modules + training."""
        video_count = 0
        total_duration = 0
        pdf_count = 0
        image_count = 0

        # Module content (theory, nutrition, recovery)
        for module in obj.modules.filter(is_filled=True):
            for content in module.contents.all():
                if content.content_type == 'video' and content.vimeo_video:
                    video_count += 1
                    total_duration += content.vimeo_video.duration_seconds or 0
                elif content.content_type == 'pdf':
                    pdf_count += 1
                elif content.content_type == 'image':
                    image_count += 1

        # Training content (day contents across all variants)
        for variant in obj.training_variants.all():
            for week in variant.weeks.all():
                for day in week.days.all():
                    for dc in day.contents.all():
                        if dc.content_type == 'video' and dc.vimeo_video:
                            video_count += 1
                            total_duration += dc.vimeo_video.duration_seconds or 0
                        elif dc.content_type == 'pdf':
                            pdf_count += 1
                        elif dc.content_type == 'image':
                            image_count += 1

        # Format total duration
        hours, remainder = divmod(total_duration, 3600)
        minutes, _ = divmod(remainder, 60)
        if hours:
            duration_str = f"{hours} ч {minutes} мин"
        else:
            duration_str = f"{minutes} мин"

        return {
            'video_count': video_count,
            'total_duration': duration_str,
            'total_duration_seconds': total_duration,
            'pdf_count': pdf_count,
            'image_count': image_count,
        }
