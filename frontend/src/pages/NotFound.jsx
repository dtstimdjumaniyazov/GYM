import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="text-center mt-20">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-xl mt-4">{t('not_found.text')}</p>
      <Link to="/" className="text-bg-header underline mt-4 inline-block hover:text-link-hover">
        {t('not_found.go_home')}
      </Link>
    </div>
  )
}

export default NotFound
