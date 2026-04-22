import uuid
from django.db import models
from users.models import Trainer

# Create your models here.
class VimeoVideo(models.Model):
    """Видео, загруженное на Vimeo."""
    
    class UploadStatus(models.TextChoices):
        PENDING = 'pending', 'Ожидает загрузки'
        UPLOADING = 'uploading', 'Загружается'
        PROCESSING = 'processing', 'Обрабатывается'
        COMPLETE = 'complete', 'Готово'
        ERROR = 'error', 'Ошибка'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vimeo_id = models.CharField(
        'Vimeo ID', 
        max_length=50, 
        unique=True,
        help_text='ID видео на платформе Vimeo'
    )
    title = models.CharField('Название', max_length=255)
    upload_status = models.CharField(
        'Статус загрузки',
        max_length=20,
        choices=UploadStatus.choices,
        default=UploadStatus.PENDING
    )
    duration_seconds = models.PositiveIntegerField('Длительность (сек)', null=True, blank=True)
    thumbnail_url = models.URLField('Превью', max_length=500, blank=True)
    playback_url = models.URLField('URL воспроизведения', max_length=500, blank=True)
    privacy_settings = models.JSONField(
        'Настройки приватности', 
        default=dict, 
        blank=True
    )
    uploaded_by = models.ForeignKey(
        Trainer,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_videos',
        verbose_name='Загрузил'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vimeo_videos'
        verbose_name = 'Видео Vimeo'
        verbose_name_plural = 'Видео Vimeo'
    
    def __str__(self):
        return f"{self.title} ({self.vimeo_id})"
    
    @property
    def duration_formatted(self):
        """Возвращает длительность в формате MM:SS или HH:MM:SS."""
        if not self.duration_seconds:
            return "00:00"
        hours, remainder = divmod(self.duration_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        if hours:
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        return f"{minutes:02d}:{seconds:02d}"


class GoogleDriveFile(models.Model):
    """Файл, загруженный на Google Drive."""
    
    class UploadStatus(models.TextChoices):
        PENDING = 'pending', 'Ожидает загрузки'
        UPLOADING = 'uploading', 'Загружается'
        COMPLETE = 'complete', 'Готово'
        ERROR = 'error', 'Ошибка'
    
    class FileType(models.TextChoices):
        PDF = 'application/pdf', 'PDF'
        JPEG = 'image/jpeg', 'JPEG'
        PNG = 'image/png', 'PNG'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    gdrive_id = models.CharField(
        'Google Drive ID', 
        max_length=100, 
        unique=True
    )
    filename = models.CharField('Имя файла', max_length=255)
    mime_type = models.CharField(
        'MIME тип',
        max_length=100,
        choices=FileType.choices
    )
    file_size = models.BigIntegerField('Размер (байт)', null=True, blank=True)
    view_url = models.URLField(
        'URL для просмотра', 
        max_length=500, 
        blank=True,
        help_text='URL для просмотра без возможности скачивания'
    )
    upload_status = models.CharField(
        'Статус загрузки',
        max_length=20,
        choices=UploadStatus.choices,
        default=UploadStatus.PENDING
    )
    uploaded_by = models.ForeignKey(
        Trainer,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_files',
        verbose_name='Загрузил'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'gdrive_files'
        verbose_name = 'Файл Google Drive'
        verbose_name_plural = 'Файлы Google Drive'
    
    def __str__(self):
        return self.filename
    
    @property
    def file_size_formatted(self):
        """Возвращает размер в человекочитаемом формате."""
        if not self.file_size:
            return "0 B"
        for unit in ['B', 'KB', 'MB', 'GB']:
            if self.file_size < 1024:
                return f"{self.file_size:.1f} {unit}"
            self.file_size /= 1024
        return f"{self.file_size:.1f} TB"