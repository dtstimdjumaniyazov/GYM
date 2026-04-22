import base64
import hashlib
import logging
from decimal import Decimal

from django.conf import settings
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from courses.models import Course
from enrollments.models import Enrollment
from payments.models import ClickTransaction, PaymeTransaction

logger = logging.getLogger(__name__)

# ─── Click error codes ────────────────────────────────────────────
CLICK_OK = 0
CLICK_ERR_SIGN = -1
CLICK_ERR_AMOUNT = -2
CLICK_ERR_ACTION = -3
CLICK_ERR_ALREADY_PAID = -4
CLICK_ERR_USER_NOT_FOUND = -5
CLICK_ERR_TRANSACTION_NOT_FOUND = -6
CLICK_ERR_TRANSACTION_CANCELLED = -9


def _compute_sign(data: dict, action: int, merchant_prepare_id: str = '') -> str:
    """
    Click signature verification.
    Prepare (action=0):
        MD5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)
    Complete (action=1):
        MD5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
    """
    parts = [
        str(data.get('click_trans_id', '')),
        str(data.get('service_id', '')),
        settings.CLICK_SECRET_KEY,
        str(data.get('merchant_trans_id', '')),
    ]
    if action == 1:
        parts.append(str(merchant_prepare_id))
    parts += [
        str(data.get('amount', '')),
        str(action),
        str(data.get('sign_time', '')),
    ]
    sign_str = ''.join(parts)
    return hashlib.md5(sign_str.encode('utf-8')).hexdigest()


class CreateClickTransactionView(APIView):
    """
    POST /api/payments/click/create/
    Создаёт ClickTransaction и возвращает URL для редиректа на Click.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        course_id = request.data.get('course_id')
        if not course_id:
            return Response({'detail': 'course_id обязателен.'}, status=400)

        try:
            course = Course.objects.get(pk=course_id, status=Course.Status.PUBLISHED)
        except Course.DoesNotExist:
            return Response({'detail': 'Курс не найден.'}, status=404)

        # Уже куплен?
        if Enrollment.objects.filter(user=request.user, course=course, is_active=True).exists():
            return Response({'detail': 'Курс уже куплен.'}, status=400)

        transaction = ClickTransaction.objects.create(
            user=request.user,
            course=course,
            amount=course.price,
        )

        # Формируем URL Click
        return_url = f"{settings.FRONTEND_URL}/courses/{course.id}/lessons"
        params = (
            f"service_id={settings.CLICK_SERVICE_ID}"
            f"&merchant_id={settings.CLICK_MERCHANT_ID}"
            f"&amount={course.price}"
            f"&transaction_param={transaction.id}"
            f"&return_url={return_url}"
        )
        redirect_url = f"https://my.click.uz/services/pay?{params}"

        return Response({'redirect_url': redirect_url})


class ClickPrepareView(APIView):
    """
    POST /api/payments/click/prepare/
    Click вызывает этот endpoint первым (action=0).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        action = int(data.get('action', -1))

        if action != 0:
            return self._error(data, CLICK_ERR_ACTION, 'Action not found')

        # Верификация подписи
        received_sign = data.get('sign_string', '')
        expected_sign = _compute_sign(data, action=0)
        if received_sign != expected_sign:
            return self._error(data, CLICK_ERR_SIGN, 'SIGN CHECK FAILED!')

        merchant_trans_id = data.get('merchant_trans_id', '')
        try:
            transaction = ClickTransaction.objects.select_related('course').get(pk=merchant_trans_id)
        except (ClickTransaction.DoesNotExist, Exception):
            return self._error(data, CLICK_ERR_TRANSACTION_NOT_FOUND, 'Transaction not found')

        if transaction.status == ClickTransaction.Status.COMPLETED:
            return self._error(data, CLICK_ERR_ALREADY_PAID, 'Already paid')

        if transaction.status == ClickTransaction.Status.CANCELLED:
            return self._error(data, CLICK_ERR_TRANSACTION_CANCELLED, 'Transaction cancelled')

        # Сверяем сумму
        click_amount = Decimal(str(data.get('amount', '0')))
        if abs(click_amount - transaction.amount) > Decimal('0.01'):
            return self._error(data, CLICK_ERR_AMOUNT, 'Incorrect amount')

        # Сохраняем click_trans_id и переводим в prepared
        transaction.click_trans_id = data.get('click_trans_id')
        transaction.status = ClickTransaction.Status.PREPARED
        transaction.save(update_fields=['click_trans_id', 'status', 'updated_at'])

        return Response({
            'click_trans_id': int(data.get('click_trans_id', 0)),
            'merchant_trans_id': str(transaction.id),
            'merchant_prepare_id': str(transaction.id),
            'error': CLICK_OK,
            'error_note': 'Success',
        })

    def _error(self, data, code, note):
        return Response({
            'click_trans_id': int(data.get('click_trans_id', 0)),
            'merchant_trans_id': data.get('merchant_trans_id', ''),
            'merchant_prepare_id': data.get('merchant_trans_id', ''),
            'error': code,
            'error_note': note,
        })


class ClickCompleteView(APIView):
    """
    POST /api/payments/click/complete/
    Click вызывает этот endpoint вторым (action=1). Создаёт Enrollment.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        action = int(data.get('action', -1))

        if action != 1:
            return self._error(data, CLICK_ERR_ACTION, 'Action not found')

        merchant_prepare_id = data.get('merchant_prepare_id', '')

        # Верификация подписи
        received_sign = data.get('sign_string', '')
        expected_sign = _compute_sign(data, action=1, merchant_prepare_id=merchant_prepare_id)
        if received_sign != expected_sign:
            return self._error(data, CLICK_ERR_SIGN, 'SIGN CHECK FAILED!')

        merchant_trans_id = data.get('merchant_trans_id', '')
        try:
            transaction = ClickTransaction.objects.select_related('user', 'course').get(pk=merchant_trans_id)
        except (ClickTransaction.DoesNotExist, Exception):
            return self._error(data, CLICK_ERR_TRANSACTION_NOT_FOUND, 'Transaction not found')

        if transaction.status == ClickTransaction.Status.COMPLETED:
            return self._error(data, CLICK_ERR_ALREADY_PAID, 'Already paid')

        if transaction.status == ClickTransaction.Status.CANCELLED:
            return self._error(data, CLICK_ERR_TRANSACTION_CANCELLED, 'Transaction cancelled')

        # Ошибка на стороне Click — отменяем
        click_error = int(data.get('error', 0))
        if click_error < 0:
            transaction.status = ClickTransaction.Status.CANCELLED
            transaction.save(update_fields=['status', 'updated_at'])
            return self._error(data, click_error, data.get('error_note', 'Cancelled'))

        # Сверяем сумму
        click_amount = Decimal(str(data.get('amount', '0')))
        if abs(click_amount - transaction.amount) > Decimal('0.01'):
            return self._error(data, CLICK_ERR_AMOUNT, 'Incorrect amount')

        # Создаём Enrollment (идемпотентно)
        _, created = Enrollment.objects.get_or_create(
            user=transaction.user,
            course=transaction.course,
            defaults={
                'amount_paid': transaction.amount,
                'payment_method': 'click',
                'payment_id': str(transaction.click_trans_id or ''),
                'is_active': True,
            },
        )

        transaction.status = ClickTransaction.Status.COMPLETED
        transaction.save(update_fields=['status', 'updated_at'])

        logger.info(
            'Click payment completed: transaction=%s user=%s course=%s enrollment_created=%s',
            transaction.id, transaction.user_id, transaction.course_id, created,
        )

        return Response({
            'click_trans_id': int(data.get('click_trans_id', 0)),
            'merchant_trans_id': str(transaction.id),
            'merchant_confirm_id': str(transaction.id),
            'error': CLICK_OK,
            'error_note': 'Success',
        })

    def _error(self, data, code, note):
        return Response({
            'click_trans_id': int(data.get('click_trans_id', 0)),
            'merchant_trans_id': data.get('merchant_trans_id', ''),
            'merchant_confirm_id': data.get('merchant_trans_id', ''),
            'error': code,
            'error_note': note,
        })


# ─── Payme ────────────────────────────────────────────────────────────────────


class CreatePaymeTransactionView(APIView):
    """
    POST /api/payments/payme/create/
    Создаёт PaymeTransaction и возвращает URL для редиректа на Payme.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        course_id = request.data.get('course_id')
        if not course_id:
            return Response({'detail': 'course_id обязателен.'}, status=400)

        try:
            course = Course.objects.get(pk=course_id, status=Course.Status.PUBLISHED)
        except Course.DoesNotExist:
            return Response({'detail': 'Курс не найден.'}, status=404)

        if Enrollment.objects.filter(user=request.user, course=course, is_active=True).exists():
            return Response({'detail': 'Курс уже куплен.'}, status=400)

        amount_tiyin = int(course.price * 100)  # 1 UZS = 100 тийин

        transaction = PaymeTransaction.objects.create(
            user=request.user,
            course=course,
            amount=amount_tiyin,
        )

        # Строим URL для Payme Checkout
        params = (
            f"m={settings.PAYME_MERCHANT_ID}"
            f";ac.order_id={transaction.id}"
            f";a={amount_tiyin}"
            f";l=ru"
        )
        encoded = base64.b64encode(params.encode()).decode()
        redirect_url = f"https://checkout.paycom.uz/{encoded}"

        return Response({'redirect_url': redirect_url})


class PaymeCallbackView(APIView):
    """
    POST /api/payments/payme/
    Обрабатывает все JSON-RPC запросы от Payme.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        if not self._check_auth(request.headers.get('Authorization', '')):
            return self._error(-32504, 'Insufficient privilege', request.data.get('id'))

        data = request.data
        method = data.get('method', '')
        params = data.get('params', {})
        req_id = data.get('id')

        handlers = {
            'CheckPerformTransaction': self._check_perform,
            'CreateTransaction': self._create_transaction,
            'PerformTransaction': self._perform_transaction,
            'CancelTransaction': self._cancel_transaction,
            'CheckTransaction': self._check_transaction,
            'GetStatement': self._get_statement,
        }
        handler = handlers.get(method)
        if not handler:
            return self._error(-32601, 'Method not found', req_id)
        return handler(params, req_id)

    def _check_auth(self, auth_header):
        """Payme отправляет: Basic base64("Paycom:{KEY}")"""
        if not auth_header.startswith('Basic '):
            return False
        try:
            decoded = base64.b64decode(auth_header[6:]).decode()
            _, key = decoded.split(':', 1)
            return key == settings.PAYME_KEY
        except Exception:
            return False

    def _check_perform(self, params, req_id):
        """CheckPerformTransaction — можно ли создать транзакцию."""
        amount = params.get('amount')
        order_id = params.get('account', {}).get('order_id')

        try:
            txn = PaymeTransaction.objects.select_related('user', 'course').get(pk=order_id)
        except (PaymeTransaction.DoesNotExist, Exception):
            return self._error(-31050, 'Transaction not found', req_id)

        if txn.amount != amount:
            return self._error(-31003, 'Wrong amount', req_id)

        if Enrollment.objects.filter(user=txn.user, course=txn.course, is_active=True).exists():
            return self._error(-31008, 'Already purchased', req_id)

        return Response({'id': req_id, 'result': {'allow': True}})

    def _create_transaction(self, params, req_id):
        """CreateTransaction — Payme регистрирует транзакцию."""
        payme_id = params.get('id')
        time_ms = params.get('time')
        amount = params.get('amount')
        order_id = params.get('account', {}).get('order_id')

        try:
            txn = PaymeTransaction.objects.get(pk=order_id)
        except (PaymeTransaction.DoesNotExist, Exception):
            return self._error(-31050, 'Transaction not found', req_id)

        # Уже создана с этим payme_id — идемпотентно
        if txn.payme_trans_id:
            if txn.payme_trans_id != payme_id:
                return self._error(-31051, 'Transaction already exists with different id', req_id)
            if txn.state in (PaymeTransaction.STATE_CANCELLED, PaymeTransaction.STATE_CANCELLED_AFTER_COMPLETE):
                return self._error(-31008, 'Transaction cancelled', req_id)
            return Response({'id': req_id, 'result': {
                'create_time': txn.create_time,
                'transaction': str(txn.id),
                'state': txn.state,
            }})

        if txn.amount != amount:
            return self._error(-31003, 'Wrong amount', req_id)

        if Enrollment.objects.filter(user=txn.user, course=txn.course, is_active=True).exists():
            return self._error(-31008, 'Already purchased', req_id)

        txn.payme_trans_id = payme_id
        txn.state = PaymeTransaction.STATE_CREATED
        txn.create_time = time_ms
        txn.save(update_fields=['payme_trans_id', 'state', 'create_time', 'updated_at'])

        return Response({'id': req_id, 'result': {
            'create_time': txn.create_time,
            'transaction': str(txn.id),
            'state': txn.state,
        }})

    def _perform_transaction(self, params, req_id):
        """PerformTransaction — пользователь оплатил, создаём Enrollment."""
        payme_id = params.get('id')

        try:
            txn = PaymeTransaction.objects.select_related('user', 'course').get(payme_trans_id=payme_id)
        except PaymeTransaction.DoesNotExist:
            return self._error(-31050, 'Transaction not found', req_id)

        if txn.state == PaymeTransaction.STATE_COMPLETED:
            return Response({'id': req_id, 'result': {
                'transaction': str(txn.id),
                'perform_time': txn.perform_time,
                'state': txn.state,
            }})

        if txn.state != PaymeTransaction.STATE_CREATED:
            return self._error(-31008, 'Unable to perform this operation', req_id)

        now_ms = int(timezone.now().timestamp() * 1000)
        txn.state = PaymeTransaction.STATE_COMPLETED
        txn.perform_time = now_ms
        txn.save(update_fields=['state', 'perform_time', 'updated_at'])

        _, created = Enrollment.objects.get_or_create(
            user=txn.user,
            course=txn.course,
            defaults={
                'amount_paid': Decimal(txn.amount) / 100,
                'payment_method': 'payme',
                'payment_id': str(txn.payme_trans_id),
                'is_active': True,
            },
        )

        logger.info(
            'Payme payment completed: transaction=%s user=%s course=%s enrollment_created=%s',
            txn.id, txn.user_id, txn.course_id, created,
        )

        return Response({'id': req_id, 'result': {
            'transaction': str(txn.id),
            'perform_time': txn.perform_time,
            'state': txn.state,
        }})

    def _cancel_transaction(self, params, req_id):
        """CancelTransaction."""
        payme_id = params.get('id')
        reason = params.get('reason')

        try:
            txn = PaymeTransaction.objects.get(payme_trans_id=payme_id)
        except PaymeTransaction.DoesNotExist:
            return self._error(-31050, 'Transaction not found', req_id)

        if txn.state == PaymeTransaction.STATE_COMPLETED:
            return self._error(-31060, 'Unable to cancel completed transaction', req_id)

        if txn.state in (PaymeTransaction.STATE_CANCELLED, PaymeTransaction.STATE_CANCELLED_AFTER_COMPLETE):
            return Response({'id': req_id, 'result': {
                'transaction': str(txn.id),
                'cancel_time': txn.cancel_time,
                'state': txn.state,
            }})

        now_ms = int(timezone.now().timestamp() * 1000)
        txn.state = PaymeTransaction.STATE_CANCELLED
        txn.cancel_time = now_ms
        txn.cancel_reason = reason
        txn.save(update_fields=['state', 'cancel_time', 'cancel_reason', 'updated_at'])

        return Response({'id': req_id, 'result': {
            'transaction': str(txn.id),
            'cancel_time': txn.cancel_time,
            'state': txn.state,
        }})

    def _check_transaction(self, params, req_id):
        """CheckTransaction."""
        payme_id = params.get('id')

        try:
            txn = PaymeTransaction.objects.get(payme_trans_id=payme_id)
        except PaymeTransaction.DoesNotExist:
            return self._error(-31050, 'Transaction not found', req_id)

        return Response({'id': req_id, 'result': {
            'create_time': txn.create_time or 0,
            'perform_time': txn.perform_time or 0,
            'cancel_time': txn.cancel_time or 0,
            'transaction': str(txn.id),
            'state': txn.state or 0,
            'reason': txn.cancel_reason,
        }})

    def _get_statement(self, params, req_id):
        """GetStatement — список транзакций за период."""
        from_ms = params.get('from', 0)
        to_ms = params.get('to', 0)

        transactions = PaymeTransaction.objects.filter(
            create_time__gte=from_ms,
            create_time__lte=to_ms,
        ).exclude(payme_trans_id=None)

        result = [
            {
                'id': t.payme_trans_id,
                'time': t.create_time,
                'amount': t.amount,
                'account': {'order_id': str(t.id)},
                'create_time': t.create_time or 0,
                'perform_time': t.perform_time or 0,
                'cancel_time': t.cancel_time or 0,
                'transaction': str(t.id),
                'state': t.state or 0,
                'reason': t.cancel_reason,
            }
            for t in transactions
        ]

        return Response({'id': req_id, 'result': {'transactions': result}})

    def _error(self, code, message, req_id=None):
        return Response({
            'id': req_id,
            'error': {
                'code': code,
                'message': {'ru': message, 'uz': message, 'en': message},
            },
        })
