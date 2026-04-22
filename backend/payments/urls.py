from django.urls import path
from payments.views import (
    CreateClickTransactionView, ClickPrepareView, ClickCompleteView,
    CreatePaymeTransactionView, PaymeCallbackView,
)

app_name = 'payments'

urlpatterns = [
    # Click UZ
    path('click/create/', CreateClickTransactionView.as_view(), name='click-create'),
    path('click/prepare/', ClickPrepareView.as_view(), name='click-prepare'),
    path('click/complete/', ClickCompleteView.as_view(), name='click-complete'),
    # Payme
    path('payme/create/', CreatePaymeTransactionView.as_view(), name='payme-create'),
    path('payme/', PaymeCallbackView.as_view(), name='payme-callback'),
]
