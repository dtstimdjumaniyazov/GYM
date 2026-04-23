from django.urls import path
from storage.views import VimeoInitUploadView, VimeoStatusView, VimeoDeleteView, GDriveUploadView, GDriveFileProxyView, GDriveDeleteView

app_name = 'storage'

urlpatterns = [
    path('vimeo/init/', VimeoInitUploadView.as_view(), name='vimeo-init'),
    path('vimeo/<uuid:pk>/status/', VimeoStatusView.as_view(), name='vimeo-status'),
    path('vimeo/<uuid:pk>/delete/', VimeoDeleteView.as_view(), name='vimeo-delete'),
    path('gdrive/upload/', GDriveUploadView.as_view(), name='gdrive-upload'),
    path('gdrive/<uuid:pk>/view/', GDriveFileProxyView.as_view(), name='gdrive-view'),
    path('gdrive/<uuid:pk>/delete/', GDriveDeleteView.as_view(), name='gdrive-delete'),
]
