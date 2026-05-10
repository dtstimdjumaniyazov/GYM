# Frontend — Fit Evolution Web

React 19 + Vite SPA для [fitevolution.uz](https://fitevolution.uz).

## Быстрый старт

```bash
cd frontend
npm install
npm run dev       # dev server на :5173, прокси /api → localhost:8000
```

Приложение доступно на `http://localhost:5173`

## Переменные окружения

Создать `frontend/.env`:

```env
VITE_TELEGRAM_BOT_USERNAME=fit_evolution_bot
VITE_TELEGRAM_BOT_ID=...
VITE_GOOGLE_CLIENT_ID=...
```

## Команды

```bash
npm run dev       # разработка
npm run build     # production сборка → dist/
npm run preview   # preview production сборки
npm run lint      # ESLint
```

## Стек

| Библиотека | Версия | Назначение |
|---|---|---|
| React | 19.2 | UI |
| React Router DOM | 7.13 | Маршрутизация |
| Redux Toolkit + RTK Query | 2.11 | State management + API |
| Tailwind CSS | 4.1 | Стили |
| i18next | 26 | RU/UZ локализация |
| lucide-react | 0.563 | Иконки |
| @vimeo/player | 2.30 | Vimeo плеер |
| tus-js-client | 4.3 | Resumable видео загрузка |
| react-markdown | 10.1 | Markdown рендеринг |

## Маршруты

```
/                          Главная — список курсов
/courses/:id               Детальная страница курса
/courses/:id/lessons       Просмотр уроков
/courses/create            Создать курс (только тренер)
/login                     Вход
/register                  Регистрация
/profile                   Профиль (авторизован)
/trainers/:id              Страница тренера
/trainer-faq               FAQ для тренеров
/about                     О платформе
/legal/terms               Правила и условия (и др.)
```

## Цветовая схема (Tailwind)

```
bg-main          #5365CA — основной синий (кнопки, акценты)
bg-header        #2a3378 — тёмно-синий (хедер, тёмные секции)
```

Конфигурация через CSS-переменные в `src/index.css` (Tailwind 4).

## Авторизация

Токены хранятся в `localStorage` (`access_token`, `refresh_token`).  
`src/app/api/baseQuery.js` автоматически добавляет заголовок и обновляет токен при 401.

## Локализация

Языковые файлы: `src/i18n/locales/ru.json` и `uz.json`.  
Язык сохраняется в `localStorage` как `lang` и передаётся в `Accept-Language` заголовке.

## Структура src/

```
src/
├── app/api/          RTK Query слайсы (courses, enrollments, users, ...)
├── components/       Переиспользуемые компоненты
│   └── courseCreate/ Компоненты 3-шаговой формы тренера
├── pages/            Страницы (по одной на маршрут)
│   └── legal/        Правовые документы
├── layouts/          MainLayout (Header + Outlet)
└── i18n/             i18next конфигурация + locales/
```
