# Mobile — Fit Evolution App

React Native + Expo приложение для [fitevolution.uz](https://fitevolution.uz).

## Быстрый старт

```bash
cd mobile
npm install
npm start          # Expo dev server (QR код для Expo Go)
```

Для тестирования на телефоне: установи **Expo Go** и отсканируй QR код.

## Команды

```bash
npm start          # Expo dev server
npm run android    # Android эмулятор
npm run ios        # iOS симулятор (только macOS)
npm run web        # браузер (ограниченная поддержка)
```

## Стек

| Библиотека | Версия | Назначение |
|---|---|---|
| Expo | ~54 | Платформа |
| Expo Router | ~6 | File-based маршрутизация |
| React Native | 0.81 | UI |
| Redux Toolkit | 2.x | State management |
| Axios | 1.x | HTTP клиент |
| AsyncStorage | 2.x | Токены и настройки |
| i18next | 26 | RU/UZ локализация |
| react-native-webview | 13.x | Vimeo плеер |
| expo-screen-capture | 8.x | Блокировка скриншотов |

## Маршруты (Expo Router)

```
/                          Bootstrap (проверка токена → редирект)
/auth/login                Вход
/auth/register             Регистрация
/auth/social-link          Привязка аккаунта (Google/Telegram)
/(tabs)/                   Главная
/(tabs)/catalog            Каталог курсов
/(tabs)/my-courses         Мои курсы
/(tabs)/profile            Профиль
/notifications             Уведомления
/favorites                 Избранное
/trainer/:id               Страница тренера
/course/:id/               Детальная страница курса
/course/:id/lessons        Просмотр уроков
```

## Backend API

```
Production:  https://fitevolution.uz/api
Android эмулятор: http://10.0.2.2:8000/api
iOS симулятор:    http://localhost:8000/api
```

Менять `API_URL` в `src/constants/api.js`.

## Структура

```
mobile/
├── app/                  Expo Router — файловая маршрутизация
│   ├── _layout.jsx       Root layout (Provider, StatusBar)
│   ├── index.jsx         Bootstrap
│   ├── auth/             Экраны авторизации
│   ├── (tabs)/           Tab navigation (главная, каталог, профиль)
│   ├── course/[id]/      Курс и уроки
│   ├── trainer/[id].jsx  Страница тренера
│   ├── notifications.jsx
│   └── favorites.jsx
├── src/
│   ├── constants/
│   │   ├── colors.js     Цветовая палитра (#5365CA, #2a3378, ...)
│   │   └── api.js        API_URL + ENDPOINTS
│   ├── services/
│   │   ├── api.js        Axios instance + auth interceptors
│   │   └── storage.js    AsyncStorage обёртка
│   └── store/
│       ├── index.js      Redux store
│       └── authSlice.js  Auth state (login, logout, loadProfile)
└── assets/               Иконки, сплэш-экран
```

## Авторизация

`src/services/api.js` автоматически:
1. Добавляет `Authorization: Bearer <token>` из AsyncStorage
2. При 401 — рефреш токен → повтор запроса
3. При неудаче рефреша — logout (редирект на /auth/login)

## Цвета

```js
import { COLORS } from '../src/constants/colors'

COLORS.primary     // #5365CA — основной синий
COLORS.header      // #2a3378 — тёмно-синий
COLORS.background  // #F9FAFB — фон экранов
COLORS.error       // #EF4444
```
