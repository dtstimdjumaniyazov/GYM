# Backend — Fit Evolution API

Django 5.2 REST API для фитнес-платформы [fitevolution.uz](https://fitevolution.uz).

## Быстрый старт

```bash
cd backend

# Создать виртуальное окружение (первый раз)
python -m venv .venv

# Активировать
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # Linux/Mac

# Установить зависимости
pip install -r requirements.txt

# Настроить переменные окружения
cp .env.example .env            # заполнить значения

# Применить миграции и запустить
.venv\Scripts\python.exe manage.py migrate
.venv\Scripts\python.exe manage.py runserver
```

> **Важно**: всегда используй `.venv` — системный Python не имеет зависимостей проекта.

API доступен на `http://localhost:8000/api/`

## Переменные окружения

```env
ENV=LOCAL                        # LOCAL | PROD
SECRET_KEY=...
ALLOWED_HOSTS=localhost,127.0.0.1
FRONTEND_URL=http://localhost:5173

DB_NAME=gym
DB_USER=postgres
DB_PASSWORD=...
DB_HOST=localhost
DB_PORT=5432

TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=fit_evolution_bot
GOOGLE_CLIENT_ID=...

VIMEO_ACCESS_TOKEN=...

GDRIVE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GDRIVE_FOLDER_ID=...

PAYME_MERCHANT_ID=...
PAYME_KEY=...
CLICK_SERVICE_ID=...
CLICK_MERCHANT_ID=...
CLICK_SECRET_KEY=...
```

## Стек

| Пакет | Версия | Назначение |
|---|---|---|
| Django | 5.2 | Веб-фреймворк |
| djangorestframework | 3.14 | REST API |
| simplejwt | 5.5 | JWT аутентификация |
| drf-writable-nested | 0.7 | Вложенные сериализаторы |
| psycopg2 | 2.9 | PostgreSQL адаптер |
| google-api-python-client | 2.x | Google Drive (service account) |
| gunicorn | 21.2 | WSGI сервер (prod) |
| whitenoise | 6.7 | Статика (prod) |

## Django приложения

| App | Модели |
|---|---|
| `users` | User, Trainer — авторизация (phone/Telegram/Google), JWT сессии |
| `courses` | Category, Course, CourseModule, ModuleContent, Favorite |
| `training` | TrainingVariant, WeekSchedule, DaySchedule, DayContent |
| `enrollments` | Enrollment, LessonProgress |
| `storage` | VimeoVideo, GoogleDriveFile |
| `payments` | PaymeTransaction, ClickTransaction |
| `notifications` | Notification |

## API маршруты

```
/api/users/         авторизация, профили, тренеры
/api/courses/       курсы, категории, избранное
/api/training/      варианты тренировок и расписание
/api/enrollments/   записи на курсы, прогресс
/api/storage/       загрузка видео (Vimeo) и файлов (GDrive)
/api/payments/      Payme + Click UZ вебхуки
/api/notifications/ уведомления пользователей
/admin/             Django admin
```

## Полезные команды

```bash
# Миграции
.venv\Scripts\python.exe manage.py makemigrations
.venv\Scripts\python.exe manage.py migrate

# Суперпользователь
.venv\Scripts\python.exe manage.py createsuperuser

# Очистка удалённых курсов (файлы в Vimeo + GDrive)
.venv\Scripts\python.exe manage.py cleanup_expired_courses
```

## Деплой (Ubuntu + nginx)

```bash
# Сборка статики
.venv/bin/python manage.py collectstatic --no-input

# Перезапуск
sudo systemctl restart gym
sudo systemctl status gym
```

Конфигурация nginx и systemd — в `../deploy/`.
