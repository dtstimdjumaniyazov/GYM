# Frontend — React 19 + Vite + Tailwind CSS 4

## Запуск

```bash
npm run dev      # dev server на :5173, прокси /api → localhost:8000
npm run build    # production build в dist/
npm run lint     # ESLint проверка
npm run preview  # preview built app
```

## Стек

| Библиотека | Версия | Назначение |
|---|---|---|
| React | 19.2 | UI |
| React Router DOM | 7.13 | Маршрутизация |
| Redux Toolkit + RTK Query | 2.11 | State + API |
| Tailwind CSS | 4.1 | Стили |
| i18next + react-i18next | 26/17 | RU/UZ локализация |
| lucide-react | 0.563 | Иконки |
| react-markdown | 10.1 | Рендеринг Markdown |
| tus-js-client | 4.3.1 | Resumable Vimeo upload |
| @vimeo/player | 2.30.2 | Vimeo плеер |
| @react-oauth/google | 0.13.4 | Google OAuth |

## Структура src/

```
src/
├── app/
│   ├── store.js              # Redux store
│   └── api/
│       ├── baseQuery.js      # fetchBaseQuery + автообновление токена
│       ├── apiSlice.js       # базовый RTK Query slice (tag types)
│       ├── coursesApi.js     # курсы, категории, избранное
│       ├── courseCreateApi.js # создание курса + загрузка файлов
│       ├── enrollmentsApi.js # записи на курсы, прогресс
│       ├── usersApi.js       # авторизация, профиль, тренеры
│       ├── trainersApi.js    # публичный список тренеров
│       ├── paymentsApi.js    # Payme + Click транзакции
│       ├── notificationsApi.js # уведомления
│       └── trainingApi.js    # варианты тренировок
├── components/
│   ├── courseCreate/         # компоненты 3-шаговой формы создания курса
│   ├── Header.jsx            # навигация, меню пользователя, переключатель языка
│   ├── CourseCard.jsx
│   ├── TrainerCard.jsx
│   ├── VimeoPlayer.jsx
│   ├── FileViewerModal.jsx
│   └── ...
├── pages/
│   ├── legal/                # Terms, Privacy, MedicalDisclaimer и др.
│   ├── Home.jsx
│   ├── CourseDetail.jsx
│   ├── CourseLessons.jsx
│   ├── CourseCreate.jsx      # тренерская форма (3 шага)
│   ├── Profile.jsx           # профиль пользователя/тренера
│   ├── Login.jsx / Register.jsx
│   └── ...
├── layouts/
│   └── MainLayout.jsx        # Header + Outlet (react-router)
├── i18n/
│   └── index.js              # i18next настройка
└── locales/
    ├── ru.json
    └── uz.json
```

## RTK Query — паттерны

### Как делать запросы в компоненте
```jsx
import { useGetCourseQuery } from '../app/api/coursesApi'

const { data, isLoading, error } = useGetCourseQuery(courseId)
```

### Как инвалидировать кеш
```jsx
// В мутации — указываем invalidatesTags
publishCourse: builder.mutation({
  query: ({ id, action }) => ({ url: `/courses/trainer/${id}/publish/`, method: 'PATCH', body: { action } }),
  invalidatesTags: (result, error, { id }) => [{ type: 'Course', id }],
})
```

### Оптимистичное обновление (пример из enrollmentsApi)
```jsx
onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
  const patch = dispatch(enrollmentsApi.util.updateQueryData('getProgress', arg.courseId, draft => {
    // мутируем draft напрямую
  }))
  try { await queryFulfilled }
  catch { patch.undo() }
}
```

### Tag types (apiSlice.js)
```
'Trainer', 'Course', 'Category', 'Enrollment', 'Favorite', 'User', 'Progress', 'TrainingVariant'
```

## Авторизация

`baseQuery.js` автоматически:
1. Добавляет `Authorization: Bearer <token>` из localStorage
2. При 401 — запрашивает новый токен через refresh
3. При неудаче refresh — logout (очищает localStorage, редирект на /login)

Токены хранятся в `localStorage`: `access_token`, `refresh_token`.

## Tailwind — цветовая схема

```css
bg-main          /* #5365CA — основной синий (кнопки, акценты) */
bg-header        /* #2a3378 — тёмно-синий (хедер) */
text-primary     /* основной текст */
text-header      /* заголовки */
link-hover       /* цвет ссылки при hover */
```

Tailwind 4 — конфигурация через CSS переменные в `index.css`, не через `tailwind.config.js`.

## Локализация (i18n)

```jsx
import { useTranslation } from 'react-i18next'

const { t, i18n } = useTranslation()
t('key.nested')           // перевод
i18n.changeLanguage('uz') // переключить язык
```

Язык сохраняется в `localStorage` как `'lang'`. При API запросах передаётся в `Accept-Language` заголовке.

## Google Drive URL — конвертация

Drive URL для просмотра нужно конвертировать для использования как `<img src>`:
```js
// Используй toDirectUrl() утилиту (если есть) или:
const directUrl = url.replace('/view', '/preview')
// Для thumbnail: https://drive.google.com/thumbnail?id=FILE_ID&sz=w400
```

## Загрузка видео (Vimeo TUS)

```js
import { uploadVideoViaTus } from '../app/api/courseCreateApi'

// 1. Инициализация
const { data } = await initVimeoUpload({ title, size }).unwrap()
// 2. Загрузка с прогрессом
const abortRef = await uploadVideoViaTus(data.upload_url, file, (percent) => setProgress(percent))
// 3. Обновление статуса
await updateVimeoStatus({ id: data.id, upload_status: 'complete' }).unwrap()
```

## Загрузка файлов (Google Drive)

```js
import { uploadFileToGDrive } from '../app/api/courseCreateApi'

const abortController = await uploadFileToGDrive(file, (percent) => setProgress(percent))
// возвращает { id, filename, view_url, mime_type }
```

## Маршруты (React Router)

```
/                          Home
/courses/:id               CourseDetail
/courses/:id/lessons       CourseLessons
/courses/create            CourseCreate (только тренер)
/login                     Login
/register                  Register
/profile                   Profile (авторизован)
/trainers/:id              TrainerDetail
/trainer-faq               TrainerFaq
/legal/terms               Terms и др.
```

## Мобильное приложение — что взять из frontend

При разработке React Native (mobile/):
- Вся бизнес-логика API — переиспользовать endpoint URL'ы и логику из `src/app/api/`
- Локализацию — те же `locales/ru.json` и `locales/uz.json`
- Цветовую схему — те же значения (#5365CA, #2a3378 и т.д.)
- RTK Query работает в React Native — можно переиспользовать API слайсы почти без изменений
- Для видео: `expo-av` или `react-native-video` + WebView для Vimeo

## Добавление нового endpoint'а — чеклист

1. Добавить в соответствующий `*Api.js` файл в `src/app/api/`
2. Указать правильные `providesTags` / `invalidatesTags`
3. Экспортировать hook (`useGetXxxQuery` / `useXxxMutation`)
4. Использовать в компоненте

## Переменные окружения (frontend/.env)

```
VITE_TELEGRAM_BOT_USERNAME=fit_evolution_bot
VITE_TELEGRAM_BOT_ID=...
VITE_GOOGLE_CLIENT_ID=...
```

Доступны в коде как `import.meta.env.VITE_XXX`.
