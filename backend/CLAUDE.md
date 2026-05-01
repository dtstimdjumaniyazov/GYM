# Backend — Django 5.2 REST API

## Запуск

```bash
# Windows (всегда используй venv!)
.venv/Scripts/python.exe manage.py runserver
.venv/Scripts/python.exe manage.py makemigrations
.venv/Scripts/python.exe manage.py migrate
.venv/Scripts/python.exe manage.py createsuperuser

# Linux/Mac
.venv/bin/python manage.py runserver
```

**Никогда не используй системный Python** — у него нет зависимостей проекта.

## Django Apps

| App | Назначение |
|---|---|
| `users` | User, Trainer, авторизация (phone/Telegram/Google), JWT сессии |
| `courses` | Category, Course, CourseModule, ModuleContent, Favorite |
| `training` | TrainingVariant, WeekSchedule, DaySchedule, DayContent |
| `enrollments` | Enrollment (запись на курс), LessonProgress |
| `storage` | VimeoVideo, GoogleDriveFile |
| `payments` | PaymeTransaction, ClickTransaction |
| `notifications` | Notification (типы: course events, trainer verification) |

## Ключевые паттерны

### Модели
- **UUID primary keys** везде (`id = models.UUIDField(primary_key=True, default=uuid.uuid4)`)
- Все модели с контентом имеют `created_at`, `updated_at`
- Двуязычные поля: `title` (ru) + `title_uz` (uz)

### Сериализаторы
- `*CardSerializer` — для списков (минимум полей)
- `*DetailSerializer` — для детального просмотра (все поля + вложенные объекты)
- `*WriteSerializer` или `*CreateSerializer` — для записи данных
- Используем `drf-writable-nested` для вложенных данных (создание курса с модулями)

### Views
- `ListAPIView`, `RetrieveAPIView` из DRF generics — стандарт для простых endpoint'ов
- `APIView` — для кастомной логики (favorite toggle, set-variant и т.д.)
- Пагинация: page-based, 15 элементов/страницу (PageNumberPagination)

### Permissions
- `IsAuthenticated` — для авторизованных пользователей
- `IsTrainer` (`courses/permissions.py`) — только тренеры с `trainer_profile`
- `IsAdminUser` — только для admin endpoint'ов

### Аутентификация
- `SingleSessionJWTAuthentication` (`users/tokens.py`) — кастомный JWT
- `token_version` на User модели: инкремент инвалидирует все старые токены
- Social auth: Telegram (HMAC подпись initData) + Google (credential токен)

## Модели — важные детали

### User (`users/models.py`)
```python
phone          # PhoneNumberField, unique (+998...)
role           # 'student' | 'trainer'
token_version  # для инвалидации JWT сессий
telegram_id, google_id, email  # social auth
is_profile_complete  # property: проверяет реальный +998 номер
```

### Course (`courses/models.py`)
```python
status  # draft → pending_review → published (или revision_required)
price   # минимум 300 000 UZS (валидация в сериализаторе И фронте)
primary_module  # property: модуль с is_primary=True (priority=5)
```

### CourseModule (`courses/models.py`)
```python
type      # training | theory | nutrition | recovery | sports_nutrition | training_nuances
priority  # 0-5, priority=5 → is_primary=True (автоматически)
# Constraint: уникальный type per course, уникальный priority per course
```

### ModuleContent & DayContent
```python
# Ровно одно из двух (XOR constraint):
vimeo_video = ForeignKey(VimeoVideo, null=True, blank=True)
gdrive_file  = ForeignKey(GoogleDriveFile, null=True, blank=True)
# Валидация в clean() — нельзя указать оба или ни одного
```

### Enrollment (`enrollments/models.py`)
```python
variant_locked  # True после выбора варианта тренировки
progress_percent  # property: completed_items / total_items * 100
```

## Storage интеграции

### Vimeo (видео)
```
POST /api/storage/vimeo/init/       → создаёт VimeoVideo, возвращает TUS upload URL
PATCH /api/storage/vimeo/<id>/status/ → обновляет статус (uploading/complete/error)
DELETE /api/storage/vimeo/<id>/delete/ → удаляет с Vimeo + из БД
```
Статусы: `pending → uploading → processing → complete | error`

### Google Drive (файлы)
```
POST /api/storage/gdrive/upload/    → multipart upload, service account
DELETE /api/storage/gdrive/<id>/delete/ → удаляет из Drive + из БД
```
Только просмотр (view_url) — скачивание заблокировано.

## Платежи

- **Payme**: POST `/api/payments/payme/` — вебхук, создаёт PaymeTransaction
- **Click**: POST `/api/payments/click/prepare/` + `/complete/` — вебхуки
- После успешного платежа → автоматически создаётся `Enrollment`

## Локализация

```python
from core.i18n import loc

# Возвращает field_uz если lang='uz' и поле не пустое, иначе field
value = loc(obj, 'title', lang)  # → obj.title_uz или obj.title
```
Язык передаётся в `Accept-Language` заголовке от frontend.

## Management Commands

```bash
# Удаляет курсы через 90 дней после подтверждения удаления
# Очищает связанные файлы в Vimeo и Google Drive
.venv/Scripts/python.exe manage.py cleanup_expired_courses
```

## Настройки окружения (settings.py)

```python
ENV = os.getenv('ENV', 'LOCAL')  # LOCAL или PROD

# LOCAL: DEBUG=True, CORS permissive, SQLite возможен
# PROD: DEBUG=False, CORS restrictive, SSL redirect, HTTPS cookies
```

## Добавление нового endpoint'а — чеклист

1. Модель в `models.py` + миграция
2. Сериализатор в `serializers.py` (Card/Detail/Write)
3. View в `views.py` (generics или APIView)
4. URL в `urls.py` приложения
5. Подключить в `backend/urls.py` если новый app
6. Permission класс если нужен новый тип доступа

## Мобильное приложение — API соображения

При создании mobile API (React Native):
- Тот же JWT auth (`/api/users/token/`)
- Нужно будет добавить `device_token` поле на User для push-уведомлений (FCM/APNs)
- Vimeo player в mobile — через WebView или `@vimeo/react-native-player`
- Все endpoint'ы уже готовы — mobile использует тот же API что и web
