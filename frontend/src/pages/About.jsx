import { useTranslation } from 'react-i18next'

function About() {
  const { t } = useTranslation()
  return (
    <div>
      <h1 className="text-3xl font-bold">{t('about.title')}</h1>
    </div>
  )
}

export default About
