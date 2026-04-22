import { Link, useNavigate } from 'react-router-dom'
import { useToggleFavoriteMutation } from '../app/api/coursesApi'
import { useGetUserProfileQuery } from '../app/api/usersApi'
import { useTranslation } from 'react-i18next'

function toDirectUrl(url) {
  if (!url) return null
  const match = url.match(/\/file\/d\/([^/]+)/)
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`
  return url
}

function CourseCard({ course }) {
  const { t } = useTranslation()
  const isPurchased = false // TODO: определяется из enrollments API
  const coverSrc = toDirectUrl(course.cover_url)
  const isLoggedIn = !!localStorage.getItem('access_token')
  const navigate = useNavigate()
  const [toggleFavorite, { isLoading: favLoading }] = useToggleFavoriteMutation()
  const { data: profile } = useGetUserProfileQuery(undefined, { skip: !isLoggedIn })
  const isTrainer = profile?.role === 'trainer'

  const LEVEL_LABELS = {
    beginner: t('course.level_beginner'),
    intermediate: t('course.level_intermediate'),
    advanced: t('course.level_advanced'),
  }

  const FORMAT_LABELS = {
    home: t('course.format_home'),
    gym: t('course.format_gym'),
    mixed: t('course.format_mixed'),
  }

  const LANG_LABELS = {
    ru: t('course.lang_ru'),
    uz: t('course.lang_uz'),
    en: t('course.lang_en'),
  }

  const handleFavoriteClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    if (!favLoading) {
      await toggleFavorite(course.id)
    }
  }

  const variantCount = course.variants_count || 0
  const variantLabel = variantCount === 1
    ? t('course.training_variant_one', { count: variantCount })
    : variantCount < 5
      ? t('course.training_variant_few', { count: variantCount })
      : t('course.training_variant_many', { count: variantCount })

  return (
    <Link
      to={`/courses/${course.id}`}
      className="bg-bg-header/80 rounded-2xl overflow-hidden flex flex-col hover:ring-2 hover:ring-link-hover/40 transition-all"
    >
      <div className="relative aspect-video bg-bg-header">
        {coverSrc && (
          <img
            src={coverSrc}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        )}
        {!isTrainer && <button
          onClick={handleFavoriteClick}
          disabled={favLoading}
          className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors cursor-pointer"
        >
          {course.is_favorited ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500">
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 8.25c0-3.105-2.464-5.25-5.437-5.25a5.5 5.5 0 00-4.313 2.052A5.5 5.5 0 007.688 3C4.714 3 2.25 5.145 2.25 8.25c0 3.925 2.438 7.111 4.739 9.256a25.175 25.175 0 004.244 3.17c.138.08.283.144.383.218l.022.012.007.004.003.001a.752.752 0 00.704 0l.003-.001.007-.004.022-.012a15.247 15.247 0 00.383-.218 25.18 25.18 0 004.244-3.17C19.312 15.36 21.75 12.174 21.75 8.25z" />
            </svg>
          )}
        </button>}
      </div>

      <div className="p-5 flex flex-col gap-3 flex-1">
        <h3 className="font-bold text-lg text-text-header leading-tight">
          {course.title}
        </h3>

        <p className="text-link-hover text-sm">{course.trainer_name}</p>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-bg-main/40 text-text-header px-2 py-1 rounded-full">
            {LEVEL_LABELS[course.level] || course.level}
          </span>
          <span className="bg-bg-main/40 text-text-header px-2 py-1 rounded-full">
            {FORMAT_LABELS[course.format] || course.format}
          </span>
          <span className="bg-bg-main/40 text-text-header px-2 py-1 rounded-full">
            {LANG_LABELS[course.language] || course.language}
          </span>
        </div>

        {course.target_weight_range && (
          <p className="text-sm text-text-header opacity-75">
            {t('course.weight_label')} {course.target_weight_range}
          </p>
        )}

        <div className="flex items-center gap-3 text-sm text-text-header opacity-75">
          <span>{t('course.purchases_count', { count: course.purchases_count || 0 })}</span>
          <span>{'★'.repeat(Math.round(course.rating || 0))}{'☆'.repeat(5 - Math.round(course.rating || 0))} {Number(course.rating || 0).toFixed(1)}</span>
          {variantCount > 0 && (
            <span>🗂 {variantLabel}</span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-bold text-text-header text-lg">
            {Number(course.price).toLocaleString('ru-RU')} UZS
          </span>
          {isPurchased ? (
            <span className="text-green-400 text-sm font-medium">{t('course.bought')}</span>
          ) : (
            <span className="text-link-hover text-sm">{t('course.not_bought')}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default CourseCard
