# Mobile — React Native + Expo (Fit Evolution)

## Запуск

```bash
cd mobile
npm start          # Expo dev server (QR код для Expo Go)
npm run android    # Android эмулятор
npm run ios        # iOS симулятор (только macOS)
```

Для тестирования на телефоне: установи **Expo Go** и отсканируй QR код.

## Стек

| Библиотека | Версия | Назначение |
|---|---|---|
| Expo | ~54 | Платформа |
| Expo Router | ~6 | File-based маршрутизация |
| React Native | 0.81 | UI |
| Redux Toolkit | 2.x | State management |
| Axios | 1.x | HTTP клиент |
| AsyncStorage | 3.x | Локальное хранилище (токены, язык) |
| i18next | 26.x | RU/UZ локализация |

## Структура

```
mobile/
├── app/                      # Expo Router — файловая маршрутизация
│   ├── _layout.jsx           # Root layout (Provider, StatusBar)
│   ├── index.jsx             # Splash/bootstrap: проверяет токен → редирект
│   ├── auth/
│   │   ├── _layout.jsx
│   │   ├── login.jsx
│   │   └── register.jsx
│   └── (tabs)/               # Tab navigation
│       ├── _layout.jsx       # Tab bar конфигурация
│       ├── index.jsx         # Главная
│       ├── catalog.jsx       # Каталог курсов
│       ├── my-courses.jsx    # Мои курсы
│       └── profile.jsx       # Профиль + выход
├── src/
│   ├── constants/
│   │   ├── colors.js         # Цветовая палитра (совпадает с web)
│   │   └── api.js            # API_URL + ENDPOINTS
│   ├── services/
│   │   ├── api.js            # Axios instance + auth interceptors
│   │   └── storage.js        # AsyncStorage обёртка (токены, язык)
│   └── store/
│       ├── index.js          # Redux store
│       └── authSlice.js      # Auth state (login, logout, loadProfile)
└── assets/                   # Иконки, сплэш-экран
```

## Маршрутизация (Expo Router)

Expo Router использует файловую структуру, как Next.js:
- `app/index.jsx` → `/` (bootstrap)
- `app/auth/login.jsx` → `/auth/login`
- `app/(tabs)/index.jsx` → tab home
- `(tabs)` — группа с tab bar навигацией (скобки = layout wrapper без URL сегмента)

```jsx
import { useRouter } from 'expo-router'
const router = useRouter()
router.replace('/auth/login')    // replace (нельзя назад)
router.push('/courses/123')      // push на стек
router.back()                    // назад
```

## Цвета (colors.js)

```js
COLORS.primary   // #5365CA — основной синий
COLORS.header    // #2a3378 — тёмно-синий (хедер, auth screens фон)
COLORS.white     // #FFFFFF
COLORS.background // #F9FAFB — фон экранов
COLORS.card      // #FFFFFF — карточки
COLORS.error     // #EF4444
```

## API + Auth

`src/services/api.js` — axios с перехватчиками:
1. Добавляет `Authorization: Bearer <token>` из AsyncStorage
2. При 401 — рефреш токен → повтор запроса
3. При неудаче рефреша — очищает токены (пользователь увидит экран логина)

```js
import api from '../src/services/api'

const { data } = await api.get('/courses/')
const { data } = await api.post('/enrollments/123/set-variant/', { variant_id: 'uuid' })
```

## Redux

```jsx
import { useDispatch, useSelector } from 'react-redux'
import { login, logout, loadProfile } from '../src/store/authSlice'

const { user, isAuthenticated, isLoading, error } = useSelector(s => s.auth)
const dispatch = useDispatch()

await dispatch(login({ phone: '+998901234567', password: 'pass' }))
await dispatch(loadProfile())
await dispatch(logout())
```

## Добавление нового экрана — чеклист

1. Создать файл в `app/` по нужному пути
2. Если нужен заголовок — настроить в `<Stack.Screen options={{ title: '...' }} />`
3. Данные — через axios `api` или Redux thunk
4. Стили — StyleSheet.create() с цветами из `COLORS`

## Ключевые отличия от Web (frontend/)

| Web | Mobile |
|---|---|
| RTK Query | Redux Toolkit + axios напрямую |
| localStorage | AsyncStorage |
| Tailwind CSS | StyleSheet.create() |
| React Router | Expo Router |
| lucide-react | lucide-react-native (нужно установить) |
| Vimeo player (web) | expo-av или WebView |

## Подключение к backend

Backend API: `https://fitevolution.uz/api`
Для локальной разработки с эмулятором Android: `http://10.0.2.2:8000/api`
Для iOS симулятора: `http://localhost:8000/api`

Менять `API_URL` в `src/constants/api.js`.
