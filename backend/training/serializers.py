from rest_framework import serializers
from drf_writable_nested.serializers import WritableNestedModelSerializer

from training.models import TrainingVariant, WeekSchedule, DaySchedule, DayContent
from storage.models import VimeoVideo, GoogleDriveFile
from courses.serializers import VimeoVideoSerializer, GoogleDriveFileSerializer


# ─── Read serializers (for lesson display) ────────────────────

class DayContentSerializer(serializers.ModelSerializer):
    vimeo_video = VimeoVideoSerializer(read_only=True)
    gdrive_file = GoogleDriveFileSerializer(read_only=True)

    class Meta:
        model = DayContent
        fields = [
            'id', 'title', 'order', 'content_type',
            'vimeo_video', 'gdrive_file',
        ]


class DayScheduleSerializer(serializers.ModelSerializer):
    contents = DayContentSerializer(many=True, read_only=True)
    day_of_week_display = serializers.CharField(
        source='get_day_of_week_display', read_only=True
    )

    class Meta:
        model = DaySchedule
        fields = [
            'id', 'day_of_week', 'day_of_week_display',
            'is_rest_day', 'contents',
        ]


class WeekScheduleSerializer(serializers.ModelSerializer):
    days = DayScheduleSerializer(many=True, read_only=True)

    class Meta:
        model = WeekSchedule
        fields = ['id', 'week_number', 'days']


class TrainingVariantDetailSerializer(serializers.ModelSerializer):
    weeks = WeekScheduleSerializer(many=True, read_only=True)

    class Meta:
        model = TrainingVariant
        fields = [
            'id', 'variant_number', 'name', 'description', 'weeks',
        ]


# ─── Write serializers (for trainer course creation) ──────────

class DayContentWriteSerializer(serializers.ModelSerializer):
    vimeo_video = serializers.PrimaryKeyRelatedField(
        queryset=VimeoVideo.objects.all(),
        allow_null=True,
        required=False,
    )
    gdrive_file = serializers.PrimaryKeyRelatedField(
        queryset=GoogleDriveFile.objects.all(),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = DayContent
        fields = ['id', 'title', 'order', 'content_type', 'vimeo_video', 'gdrive_file']

    def validate(self, data):
        vimeo = data.get('vimeo_video')
        gdrive = data.get('gdrive_file')
        if not vimeo and not gdrive:
            raise serializers.ValidationError('Должен быть указан видео или файл.')
        if vimeo and gdrive:
            raise serializers.ValidationError('Нельзя указать и видео, и файл одновременно.')
        return data


class DayScheduleWriteSerializer(WritableNestedModelSerializer):
    contents = DayContentWriteSerializer(many=True, required=False)

    class Meta:
        model = DaySchedule
        fields = ['id', 'day_of_week', 'is_rest_day', 'contents']

    def validate_contents(self, value):
        videos = [c for c in value if c.get('content_type') == 'video']
        files = [c for c in value if c.get('content_type') in ('pdf', 'image')]
        if len(videos) > 5:
            raise serializers.ValidationError('Максимум 5 видео на день.')
        if len(files) > 5:
            raise serializers.ValidationError('Максимум 5 файлов (PDF/JPEG) на день.')
        return value


class WeekScheduleWriteSerializer(WritableNestedModelSerializer):
    days = DayScheduleWriteSerializer(many=True, required=False)

    class Meta:
        model = WeekSchedule
        fields = ['id', 'week_number', 'days']


class TrainingVariantWriteSerializer(WritableNestedModelSerializer):
    weeks = WeekScheduleWriteSerializer(many=True, required=False)

    class Meta:
        model = TrainingVariant
        fields = ['id', 'course', 'variant_number', 'name', 'description', 'weeks']

    def validate_variant_number(self, value):
        if value not in (1, 2, 3):
            raise serializers.ValidationError('Номер варианта должен быть 1, 2 или 3.')
        return value

    def update(self, instance, validated_data):
        """
        Override drf-writable-nested update to match weeks/days by natural keys
        (week_number, day_of_week) instead of UUIDs.
        This avoids unique-constraint violations when the client doesn't send IDs.
        """
        weeks_data = validated_data.pop('weeks', [])

        # Update variant scalar fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Reconcile weeks by week_number
        existing_weeks = {w.week_number: w for w in instance.weeks.all()}
        new_week_numbers = {w['week_number'] for w in weeks_data}

        # Delete weeks that were removed
        for wnum, week in existing_weeks.items():
            if wnum not in new_week_numbers:
                week.delete()

        for week_data in weeks_data:
            days_data = week_data.pop('days', [])
            week_data.pop('id', None)
            wnum = week_data['week_number']

            if wnum in existing_weeks:
                week = existing_weeks[wnum]
            else:
                week = WeekSchedule.objects.create(variant=instance, week_number=wnum)

            # Reconcile days by day_of_week
            existing_days = {d.day_of_week: d for d in week.days.all()}
            new_day_numbers = {d['day_of_week'] for d in days_data}

            # Delete days that were removed
            for dnum, day in existing_days.items():
                if dnum not in new_day_numbers:
                    day.delete()

            for day_data in days_data:
                contents_data = day_data.pop('contents', [])
                day_data.pop('id', None)
                dnum = day_data['day_of_week']
                is_rest = day_data.get('is_rest_day', False)

                if dnum in existing_days:
                    day = existing_days[dnum]
                    day.is_rest_day = is_rest
                    day.save()
                else:
                    day = DaySchedule.objects.create(
                        week=week, day_of_week=dnum, is_rest_day=is_rest
                    )

                # Replace all contents for this day
                day.contents.all().delete()
                for content_data in contents_data:
                    content_data.pop('id', None)
                    DayContent.objects.create(day=day, **content_data)

        return instance
