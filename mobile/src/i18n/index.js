import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { storage } from '../services/storage'
import ru from './locales/ru.json'
import uz from './locales/uz.json'

const initI18n = async () => {
  const lang = await storage.getLanguage()
  await i18n.use(initReactI18next).init({
    lng: lang || 'ru',
    fallbackLng: 'ru',
    resources: {
      ru: { translation: ru },
      uz: { translation: uz },
    },
    interpolation: { escapeValue: false },
  })
}

export { i18n, initI18n }
