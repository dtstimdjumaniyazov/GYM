from django.contrib import admin
from storage.models import VimeoVideo, GoogleDriveFile


admin.site.register(VimeoVideo)
admin.site.register(GoogleDriveFile)