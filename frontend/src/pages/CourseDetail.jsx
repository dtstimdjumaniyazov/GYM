import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useGetCourseQuery, useToggleFavoriteMutation } from '../app/api/coursesApi'
import { useCreateClickTransactionMutation, useCreatePaymeTransactionMutation } from '../app/api/paymentsApi'
import { useGetUserProfileQuery } from '../app/api/usersApi'
import VimeoPlayer from '../components/VimeoPlayer'
import Loader from '../components/Loader'
import { useTranslation } from 'react-i18next'

function CourseDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: course, isLoading, error } = useGetCourseQuery(id)
  const [toggleFavorite, { isLoading: favLoading }] = useToggleFavoriteMutation()
  const [createClickTransaction, { isLoading: clickLoading }] = useCreateClickTransactionMutation()
  const [createPaymeTransaction, { isLoading: paymeLoading }] = useCreatePaymeTransactionMutation()
  const [showPaymentPicker, setShowPaymentPicker] = useState(false)
  const [payError, setPayError] = useState(null)
  const payLoading = clickLoading || paymeLoading

  const isLoggedIn = !!localStorage.getItem('access_token')
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

  const MODULE_LABELS = {
    training: t('course.module_training'),
    theory: t('course.module_theory'),
    nutrition: t('course.module_nutrition'),
    recovery: t('course.module_recovery'),
  }

  const MODULE_ICONS = {
    training: '💪',
    theory: '🧠',
    nutrition: '🥗',
    recovery: '🧘',
  }

  if (isLoading) return <Loader text={t('course.loading')} />
  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold mb-4">{t('course.not_found')}</h2>
        <Link to="/" className="text-link-hover hover:underline">
          {t('common.back_to_home')}
        </Link>
      </div>
    )
  }

  const coverSrc = toDirectUrl(course.cover_url)
  const trainerPhoto = toDirectUrl(course.trainer?.photo_url)
  const primaryModule = course.modules?.find((m) => m.is_primary)

  const handleStartCourse = () => {
    if (course.is_purchased) {
      navigate(`/courses/${id}/lessons`)
      return
    }
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    setPayError(null)
    setShowPaymentPicker(true)
  }

  const handlePay = async (method) => {
    setPayError(null)
    try {
      const create = method === 'payme' ? createPaymeTransaction : createClickTransaction
      const { redirect_url } = await create(id).unwrap()
      window.location.href = redirect_url
    } catch (err) {
      setShowPaymentPicker(false)
      setPayError(err?.data?.detail || t('course.payment_error'))
    }
  }

  const handleToggleFavorite = async () => {
    if (!favLoading) {
      await toggleFavorite(id)
    }
  }

  const variantCount = course.training_variants?.length || 0
  const variantLabel = variantCount === 1
    ? t('course.variant_one', { count: variantCount })
    : variantCount < 5
      ? t('course.variant_few', { count: variantCount })
      : t('course.variant_many', { count: variantCount })

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* ─── Hero Block ─────────────────────────────── */}
      <section className="relative">
        {coverSrc && (
          <div className="w-full h-64 md:h-80 lg:h-96 overflow-hidden rounded-2xl">
            <img
              src={coverSrc}
              alt={course.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-main/90 to-transparent rounded-2xl" />
          </div>
        )}

        <div className={`${coverSrc ? 'absolute bottom-0 left-0 right-0 p-6 md:p-10' : 'pt-6'}`}>
          <h1 className="text-3xl md:text-4xl font-bold text-text-header mb-3">
            {course.title}
          </h1>
          <p className="text-lg text-text-primary/90 mb-4 max-w-2xl">
            {course.short_description}
          </p>

          {primaryModule && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-text-primary/70">{t('course.primary_focus')}</span>
              <span className="font-medium">{MODULE_LABELS[primaryModule.type]}</span>
              <StarRating rating={primaryModule.priority} />
            </div>
          )}

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1">
              <StarRating rating={course.rating} />
              <span className="text-sm ml-1">{Number(course.rating || 0).toFixed(1)}</span>
            </div>
            <span className="text-sm text-text-primary/70">
              {t('course.students_count', { count: course.purchases_count || 0 })}
            </span>
          </div>
        </div>
      </section>

      {/* ─── Trainer + Meta + Actions ────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Trainer Card */}
          <div className="bg-bg-header/60 rounded-2xl p-5 flex items-start gap-4">
            {trainerPhoto && (
              <img
                src={trainerPhoto}
                alt={course.trainer_name}
                className="w-16 h-16 rounded-full object-cover flex-shrink-0"
              />
            )}
            <div>
              <Link
                to={`/trainers/${course.trainer?.id}`}
                className="font-bold text-text-header text-lg hover:text-link-hover transition-colors"
              >
                {course.trainer_name}
              </Link>
              {course.trainer?.specialization && (
                <p className="text-sm text-text-primary/80">{course.trainer.specialization}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-text-primary/70">
                {course.trainer?.experience_years > 0 && (
                  <span>{t('course.experience', { years: course.trainer.experience_years })}</span>
                )}
                {course.trainer?.certificates?.length > 0 && (
                  <span>{t('course.certificates_count', { count: course.trainer.certificates.length })}</span>
                )}
              </div>
              {course.trainer?.short_description && (
                <p className="text-sm text-text-primary/70 mt-2">
                  {course.trainer.short_description}
                </p>
              )}
            </div>
          </div>

          {/* Meta Info Badges */}
          <div className="flex flex-wrap gap-3">
            <Badge label={t('course.badge_level')} value={LEVEL_LABELS[course.level] || course.level} />
            <Badge label={t('course.badge_duration')} value={t('course.badge_duration_value', { weeks: course.duration_weeks })} />
            <Badge label={t('course.badge_format')} value={FORMAT_LABELS[course.format] || course.format} />
            {course.equipment && <Badge label={t('course.badge_equipment')} value={course.equipment} />}
            {course.target_weight_range && <Badge label={t('course.badge_weight')} value={course.target_weight_range} />}
            <Badge label={t('course.badge_language')} value={LANG_LABELS[course.language] || course.language} />
            {variantCount > 0 && (
              <Badge label={t('course.badge_variants')} value={variantLabel} />
            )}
          </div>
        </div>

        {/* Right Column: Price + Actions */}
        <div className="bg-bg-header/80 rounded-2xl p-6 flex flex-col gap-4 h-fit lg:sticky lg:top-20">
          <div className="text-3xl font-bold text-text-header">
            {Number(course.price).toLocaleString('ru-RU')} UZS
          </div>

          {showPaymentPicker && !course.is_purchased ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text-primary/70 text-center">{t('course.select_payment')}</p>
              <button
                onClick={() => handlePay('click')}
                disabled={payLoading}
                className="w-full py-3 px-4 rounded-xl font-bold text-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: '#00AAFF' }}
              >
                {clickLoading ? t('course.redirecting') : (
                  <>
                    <span className="text-lg font-black">CLICK</span>
                    <span className="font-normal text-sm opacity-90">UZ</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handlePay('payme')}
                disabled={payLoading}
                className="w-full py-3 px-4 rounded-xl font-bold text-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: '#00A843' }}
              >
                {paymeLoading ? t('course.redirecting') : (
                  <span className="text-lg font-black">Payme</span>
                )}
              </button>
              <button
                onClick={() => setShowPaymentPicker(false)}
                disabled={payLoading}
                className="text-sm text-text-primary/50 hover:text-text-primary transition-colors cursor-pointer text-center"
              >
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartCourse}
              disabled={payLoading}
              className="w-full py-3 px-6 rounded-xl font-bold text-lg transition-all cursor-pointer bg-link-hover text-bg-header hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {course.is_purchased ? t('course.continue_course') : t('course.start_course')}
            </button>
          )}

          {payError && (
            <div className="text-red-400 text-sm text-center">
              {payError}
            </div>
          )}

          {!isTrainer && (isLoggedIn ? (
            <button
              onClick={handleToggleFavorite}
              disabled={favLoading}
              className={`w-full py-3 px-6 rounded-xl font-medium transition-all cursor-pointer border-2 ${
                course.is_favorited
                  ? 'border-red-400 text-red-400 hover:bg-red-400/10'
                  : 'border-text-primary/30 text-text-primary hover:border-text-primary/60'
              }`}
            >
              {course.is_favorited ? t('course.in_favorites') : t('course.add_to_favorites')}
            </button>
          ) : (
            <Link
              to="/login"
              className="w-full py-3 px-6 rounded-xl font-medium transition-all border-2 border-text-primary/30 text-text-primary hover:border-text-primary/60 text-center block"
            >
              {t('course.login_to_favorite')}
            </Link>
          ))}

          {course.is_purchased && (
            <div className="text-center text-green-400 text-sm font-medium">
              {t('course.purchased')}
            </div>
          )}
        </div>
      </section>

      {/* ─── Hero Body ───────────────────────────────── */}
      <section className="flex flex-col gap-8">
        {course.stats && (
          <div className="bg-bg-header/40 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-text-header mb-4">{t('course.what_includes')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="🎬" label={t('course.stat_videos')} value={course.stats.video_count} />
              <StatCard icon="⏱️" label={t('course.stat_duration')} value={course.stats.total_duration} />
              <StatCard icon="📄" label={t('course.stat_pdfs')} value={course.stats.pdf_count} />
              <StatCard icon="🖼️" label={t('course.stat_images')} value={course.stats.image_count} />
            </div>
          </div>
        )}

        {course.modules?.length > 0 && (
          <div className="bg-bg-header/40 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-text-header mb-4">{t('course.contents_title')}</h2>
            <div className="flex flex-col gap-3">
              {course.modules.map((module) => (
                <ModuleTocItem key={module.id} module={module} moduleLabels={MODULE_LABELS} moduleIcons={MODULE_ICONS} previewBadge={t('course.preview_badge')} />
              ))}
            </div>
          </div>
        )}

        {course.requirements && (
          <div className="bg-bg-header/40 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-text-header mb-3">{t('course.requirements_title')}</h2>
            <div className="text-text-primary/90 whitespace-pre-line">{course.requirements}</div>
          </div>
        )}

        {course.goals_text && (
          <div className="bg-bg-header/40 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-text-header mb-3">{t('course.goals_title')}</h2>
            <div className="text-text-primary/90 whitespace-pre-line">{course.goals_text}</div>
          </div>
        )}

        {course.full_description && (
          <div className="bg-bg-header/40 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-text-header mb-3">{t('course.description_title')}</h2>
            <div className="text-text-primary/90 whitespace-pre-line">{course.full_description}</div>
          </div>
        )}

        <PreviewSection modules={course.modules} previewTitle={t('course.preview_title')} />

        {course.trainer?.bio && (
          <div className="bg-bg-header/40 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-text-header mb-3">{t('course.about_trainer')}</h2>
            <div className="flex items-start gap-4">
              {trainerPhoto && (
                <img
                  src={trainerPhoto}
                  alt={course.trainer_name}
                  className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                />
              )}
              <div>
                <Link
                  to={`/trainers/${course.trainer?.id}`}
                  className="font-bold text-lg text-text-header hover:text-link-hover transition-colors"
                >
                  {course.trainer_name}
                </Link>
                <p className="text-text-primary/90 mt-2 whitespace-pre-line">
                  {course.trainer.bio}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

/* ─── Helpers ───────────────────────────────────────────────────── */

function toDirectUrl(url) {
  if (!url) return null
  const match = url.match(/\/file\/d\/([^/]+)/)
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`
  return url
}

function StarRating({ rating, max = 5 }) {
  return (
    <span className="text-yellow-400">
      {'★'.repeat(Math.round(rating || 0))}
      {'☆'.repeat(max - Math.round(rating || 0))}
    </span>
  )
}

function Badge({ label, value }) {
  return (
    <div className="bg-bg-header/60 rounded-xl px-4 py-2">
      <span className="text-xs text-text-primary/60 block">{label}</span>
      <span className="text-sm font-medium text-text-header">{value}</span>
    </div>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="font-bold text-text-header">{value}</div>
        <div className="text-xs text-text-primary/70">{label}</div>
      </div>
    </div>
  )
}

function ModuleTocItem({ module, moduleLabels, moduleIcons, previewBadge }) {
  const icon = moduleIcons[module.type] || '📋'
  const label = moduleLabels[module.type] || module.type
  const stars = '⭐'.repeat(module.priority)

  return (
    <div className="bg-bg-header/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-medium text-text-header">{label}</span>
        </div>
        <span className="text-sm">{stars}</span>
      </div>
      {module.contents?.length > 0 && (
        <ul className="ml-8 text-sm text-text-primary/70 space-y-1">
          {module.contents.map((content) => (
            <li key={content.id} className="flex items-center gap-2">
              <span>{content.content_type === 'video' ? '🎥' : content.content_type === 'pdf' ? '📄' : '🖼️'}</span>
              <span>{content.title}</span>
              {content.is_preview && content.content_type === 'video' && (
                <span className="text-xs bg-link-hover/20 text-link-hover px-2 py-0.5 rounded-full">
                  {previewBadge}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PreviewSection({ modules, previewTitle }) {
  if (!modules) return null

  const previewItems = []
  for (const module of modules) {
    for (const content of module.contents || []) {
      if (content.is_preview && content.content_type === 'video' && content.vimeo_video) {
        previewItems.push(content)
      }
    }
  }

  if (previewItems.length === 0) return null

  return (
    <div className="bg-bg-header/40 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-text-header mb-4">{previewTitle}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {previewItems.map((item) => (
          <div key={item.id} className="bg-bg-header/60 rounded-xl overflow-hidden">
            {item.vimeo_video?.vimeo_id ? (
              <VimeoPlayer vimeoId={item.vimeo_video.vimeo_id} />
            ) : item.vimeo_video?.thumbnail_url ? (
              <div className="aspect-video bg-bg-header flex items-center justify-center relative">
                <img
                  src={item.vimeo_video.thumbnail_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl">▶️</span>
                </div>
              </div>
            ) : null}
            <div className="p-3">
              <p className="text-sm font-medium text-text-header">{item.title}</p>
              {item.vimeo_video?.duration_formatted && (
                <p className="text-xs text-text-primary/60">{item.vimeo_video.duration_formatted}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CourseDetail
