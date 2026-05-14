import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useGetCourseQuery, useToggleFavoriteMutation } from '../app/api/coursesApi'
import { useCreateClickTransactionMutation, useCreatePaymeTransactionMutation } from '../app/api/paymentsApi'
import { useGetUserProfileQuery } from '../app/api/usersApi'
import VimeoPlayer from '../components/VimeoPlayer'
import Loader from '../components/Loader'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import {
  HiVideoCamera, HiDocumentText, HiPhoto,
  HiBolt, HiBookOpen, HiBeaker, HiSparkles,
  HiPlayCircle, HiSquares2X2,
} from 'react-icons/hi2'

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


  if (isLoading) return <Loader text={t('course.loading')} />
  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('course.not_found')}</h2>
        <Link to="/" className="text-bg-main hover:underline">
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
    <div className="flex flex-col gap-6 pb-10">
      {/* ─── Hero Block ─────────────────────────────── */}
      <section className="relative rounded-2xl overflow-hidden">
        {coverSrc ? (
          <div className="w-full h-64 md:h-80 lg:h-96">
            <img src={coverSrc} alt={course.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-gray-900/90 via-gray-900/40 to-transparent" />
          </div>
        ) : (
          <div className="w-full h-52 md:h-64 bg-linear-to-br from-bg-header via-bg-main to-bg-main/70" />
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white drop-shadow-sm">
            {course.title}
          </h1>
          <p className="text-base md:text-lg mb-4 max-w-2xl text-white/85 leading-relaxed">
            {course.short_description}
          </p>
          {primaryModule && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-white/70">{t('course.primary_focus')}</span>
              <span className="text-sm font-medium text-white">{MODULE_LABELS[primaryModule.type]}</span>
            </div>
          )}
          <span className="text-sm text-white/60">
            {t('course.students_count', { count: course.purchases_count || 0 })}
          </span>
        </div>
      </section>

      {/* ─── Trainer + Meta + Actions ────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Trainer Card */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 flex items-start gap-4 border-l-4 border-l-bg-main">
            {trainerPhoto ? (
              <img
                src={trainerPhoto}
                alt={course.trainer_name}
                className="w-14 h-14 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-bg-main/15 flex items-center justify-center shrink-0">
                <span className="text-bg-main font-bold text-xl">
                  {course.trainer_name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            <div>
              <Link
                to={`/trainers/${course.trainer?.id}`}
                className="font-bold text-gray-900 text-lg hover:text-bg-main transition-colors"
              >
                {course.trainer_name}
              </Link>
              {course.trainer?.specialization && (
                <p className="text-sm text-gray-500">{course.trainer.specialization}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                {course.trainer?.experience_years > 0 && (
                  <span>{t('course.experience', { years: course.trainer.experience_years })}</span>
                )}
                {course.trainer?.certificates?.length > 0 && (
                  <span>{t('course.certificates_count', { count: course.trainer.certificates.length })}</span>
                )}
              </div>
              {course.trainer?.short_description && (
                <p className="text-sm text-gray-500 mt-2">
                  {course.trainer.short_description}
                </p>
              )}
            </div>
          </div>

          {/* Meta Info Badges */}
          <div className="flex flex-wrap gap-2.5">
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
        <div className="bg-white border border-gray-200 shadow-md rounded-2xl overflow-hidden h-fit lg:sticky lg:top-20">
          <div className="bg-bg-main/8 border-b border-bg-main/15 px-6 py-4">
            <p className="text-sm font-semibold text-bg-main">
              {course.is_purchased ? 'Вы уже записаны' : 'Получить доступ'}
            </p>
          </div>
          <div className="p-6 flex flex-col gap-4">
          <div className="text-3xl font-bold text-gray-900">
            {Number(course.price).toLocaleString('ru-RU')} UZS
          </div>
          {!course.is_purchased && (
            <ul className="space-y-2 text-sm text-gray-600">
              {[
                'Полный доступ ко всем материалам',
                `${course.duration_weeks} недель программы`,
                'Видео, PDF и инструкции',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-bg-main shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-gray-100" />

          {showPaymentPicker && !course.is_purchased ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-500 text-center">{t('course.select_payment')}</p>
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
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer text-center"
              >
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartCourse}
              disabled={payLoading}
              className="w-full py-3 px-6 rounded-xl font-bold text-lg transition-all cursor-pointer bg-bg-main text-white hover:bg-bg-main/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {course.is_purchased ? t('course.continue_course') : t('course.start_course')}
            </button>
          )}

          {payError && (
            <div className="text-red-500 text-sm text-center">
              {payError}
            </div>
          )}

          {!isTrainer && (isLoggedIn ? (
            <button
              onClick={handleToggleFavorite}
              disabled={favLoading}
              className={`w-full py-3 px-6 rounded-xl font-medium transition-all cursor-pointer border-2 ${
                course.is_favorited
                  ? 'border-red-400 text-red-500 hover:bg-red-50'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {course.is_favorited ? t('course.in_favorites') : t('course.add_to_favorites')}
            </button>
          ) : (
            <Link
              to="/login"
              className="w-full py-3 px-6 rounded-xl font-medium transition-all border-2 border-gray-200 text-gray-600 hover:border-gray-300 text-center block"
            >
              {t('course.login_to_favorite')}
            </Link>
          ))}

          </div>
        </div>
      </section>

      {/* ─── Hero Body ───────────────────────────────── */}
      <section className="flex flex-col gap-5">
        {course.stats && (course.stats.video_count > 0 || course.stats.pdf_count > 0 || course.stats.image_count > 0) && (
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl px-6 py-4 ">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('course.what_includes')}</p>
            <div className="flex flex-wrap gap-5">
              {course.stats.video_count > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <HiVideoCamera className="w-4 h-4 text-bg-main shrink-0" />
                  <span><span className="font-semibold">{course.stats.video_count}</span> {t('course.stat_videos')}</span>
                </div>
              )}
              {course.stats.pdf_count > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <HiDocumentText className="w-4 h-4 text-bg-main shrink-0" />
                  <span><span className="font-semibold">{course.stats.pdf_count}</span> {t('course.stat_pdfs')}</span>
                </div>
              )}
              {course.stats.image_count > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <HiPhoto className="w-4 h-4 text-bg-main shrink-0" />
                  <span><span className="font-semibold">{course.stats.image_count}</span> {t('course.stat_images')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {course.modules?.length > 0 && (
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('course.contents_title')}</h2>
            <div className="flex flex-col gap-3">
              {course.modules.map((module) => (
                <ModuleTocItem key={module.id} module={module} moduleLabels={MODULE_LABELS} previewBadge={t('course.preview_badge')} />
              ))}
            </div>
          </div>
        )}

        {course.requirements && (
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">{t('course.requirements_title')}</h2>
            <div className="text-gray-700 whitespace-pre-line">{course.requirements}</div>
          </div>
        )}

        {course.goals_text && (
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">{t('course.goals_title')}</h2>
            <div className="prose prose-sm max-w-none prose-p:text-gray-700 prose-li:text-gray-700 prose-headings:text-gray-900 prose-a:text-bg-main">
              <ReactMarkdown>{course.goals_text}</ReactMarkdown>
            </div>
          </div>
        )}

        {course.full_description && (
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">{t('course.description_title')}</h2>
            <div className="text-gray-700 whitespace-pre-line">{course.full_description}</div>
          </div>
        )}

        <PreviewSection modules={course.modules} previewTitle={t('course.preview_title')} />

        {/* {course.trainer?.bio && (
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">{t('course.about_trainer')}</h2>
            <div className="flex items-start gap-4">
              {trainerPhoto && (
                <img
                  src={trainerPhoto}
                  alt={course.trainer_name}
                  className="w-20 h-20 rounded-full object-cover shrink-0"
                />
              )}
              <div>
                <Link
                  to={`/trainers/${course.trainer?.id}`}
                  className="font-bold text-lg text-gray-900 hover:text-bg-main transition-colors"
                >
                  {course.trainer_name}
                </Link>
                <p className="text-gray-600 mt-2 whitespace-pre-line">
                  {course.trainer.bio}
                </p>
              </div>
            </div>
          </div>
        )} */}
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

function Badge({ label, value }) {
  return (
    <div className="bg-bg-main/8 border border-bg-main/15 rounded-xl px-4 py-2">
      <span className="text-xs text-bg-main/60 block">{label}</span>
      <span className="text-sm font-medium text-bg-main">{value}</span>
    </div>
  )
}

const MODULE_ICON_MAP = {
  training: HiBolt,
  theory: HiBookOpen,
  nutrition: HiBeaker,
  recovery: HiSparkles,
  sports_nutrition: HiBeaker,
  training_nuances: HiSquares2X2,
}

function ModuleTocItem({ module, moduleLabels, previewBadge }) {
  const IconComp = MODULE_ICON_MAP[module.type] || HiSquares2X2
  const label = moduleLabels[module.type] || module.type
  const contentCount = module.contents?.length || 0

  return (
    <div className="bg-bg-main/5 border border-bg-main/15 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-bg-main/15 flex items-center justify-center shrink-0">
            <IconComp className="w-4 h-4 text-bg-main" />
          </div>
          <span className="font-semibold text-gray-800">{label}</span>
        </div>
        {contentCount > 0 && (
          <span className="text-xs text-bg-main/70 bg-bg-main/10 px-2.5 py-1 rounded-full shrink-0">
            {contentCount} {contentCount === 1 ? 'материал' : contentCount < 5 ? 'материала' : 'материалов'}
          </span>
        )}
      </div>
      {module.contents?.length > 0 && (
        <ul className="ml-11 mt-3 space-y-1.5">
          {module.contents.map((content) => (
            <li key={content.id} className="flex items-center gap-2 text-sm text-gray-500">
              {content.content_type === 'video' ? (
                <HiVideoCamera className="w-3.5 h-3.5 text-green-500 shrink-0" />
              ) : content.content_type === 'pdf' ? (
                <HiDocumentText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              ) : (
                <HiPhoto className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              )}
              <span className="truncate">{content.title}</span>
              {content.is_preview && content.content_type === 'video' && (
                <span className="flex items-center gap-1 text-xs bg-bg-main/10 text-bg-main px-2 py-0.5 rounded-full shrink-0">
                  <HiPlayCircle className="w-3 h-3" />
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
    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{previewTitle}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {previewItems.map((item) => (
          <div key={item.id} className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
            {item.vimeo_video?.vimeo_id ? (
              <VimeoPlayer vimeoId={item.vimeo_video.vimeo_id} />
            ) : item.vimeo_video?.thumbnail_url ? (
              <div className="aspect-video bg-gray-200 flex items-center justify-center relative">
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
              <p className="text-sm font-medium text-gray-800">{item.title}</p>
              {item.vimeo_video?.duration_formatted && (
                <p className="text-xs text-gray-400">{item.vimeo_video.duration_formatted}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CourseDetail
