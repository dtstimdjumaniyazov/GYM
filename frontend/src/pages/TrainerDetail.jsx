import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGetTrainerQuery } from '../app/api/trainersApi'
import { useGetCoursesQuery } from '../app/api/coursesApi'
import Pagination from '../components/Pagination'
import Loader from '../components/Loader'
import {
  Award,
  CheckCircle,
  ChevronRight,
  CheckCheck,
  Instagram,
  Dumbbell,
  Play,
  Trophy,
} from 'lucide-react'

function toDirectUrl(url) {
  if (!url) return null
  const match = url.match(/\/file\/d\/([^/]+)/)
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`
  return url
}

function getEmbedUrl(url) {
  if (!url) return null
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?badge=0&autopause=0&player_id=0`
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  return null
}

function TrainerDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { data: trainer, isLoading, error } = useGetTrainerQuery(id)
  const [coursesPage, setCoursesPage] = useState(1)
  const { data: coursesData, isLoading: coursesLoading } = useGetCoursesQuery({ page: coursesPage, trainer: id })
  const courses = coursesData?.results || []
  const totalCoursePages = coursesData ? Math.ceil(coursesData.count / 15) : 1

  if (isLoading) return <Loader text={t('trainer.loading')} />

  if (error || !trainer) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('trainer.not_found')}</h2>
        <Link to="/" className="text-bg-main hover:underline">{t('common.back_to_home')}</Link>
      </div>
    )
  }

  const photoSrc = toDirectUrl(trainer.photo_url) || trainer.avatar_url
  const fullName = `${trainer.first_name} ${trainer.last_name}`.trim()
  const embedUrl = getEmbedUrl(trainer.intro_video_url)

  return (
    <div className="min-h-screen pb-20">

      {/* Cover Banner */}
      <div className="h-52 sm:h-64 w-full relative bg-bg-header overflow-hidden -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 px-0"
        style={{ width: 'calc(100% + 1.5rem)' }}
      >
        <img src="https://drive.google.com/thumbnail?id=1riwNhVnYYFCQGKyAHpvsKtF3UqhNn3Qu&sz=w2000" alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-linear-to-t from-bg-header/10 via-bg-header/90 to-transparent" />
      </div>

      {/* Main container */}
      <div className="-mt-20 relative z-10 flex flex-col gap-6">

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
          {/* Avatar */}
          <div className="relative shrink-0">
            {photoSrc ? (
              <img
                src={photoSrc}
                alt={fullName}
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover ring-4 ring-white shadow-lg"
              />
            ) : (
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-bg-main/10 ring-4 ring-white shadow-lg flex items-center justify-center text-5xl font-bold text-bg-main">
                {trainer.first_name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            {trainer.is_verified && (
              <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-white rounded-full p-0.5 shadow">
                <div className="bg-blue-500 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center">
                  <CheckCheck className="w-3 h-3 text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 w-full">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-2 tracking-tight">
              {fullName}
              {trainer.is_verified && <CheckCircle className="w-6 h-6 text-bg-main shrink-0" strokeWidth={2.5} />}
            </h1>
            {trainer.specialization && (
              <p className="text-gray-500 mt-1 font-medium text-base">{trainer.specialization}</p>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              {trainer.experience_years > 0 && (
                <Badge icon={<Trophy className="w-4 h-4" />} text={t('trainer.experience', { years: trainer.experience_years })} />
              )}
              {trainer.certificates?.length > 0 && (
                <Badge icon={<Award className="w-4 h-4" />} text={t('trainer.certificates_count', { count: trainer.certificates.length })} />
              )}
              {trainer.courses_count > 0 && (
                <Badge icon={<Dumbbell className="w-4 h-4" />} text={t('trainer.courses_count', { count: trainer.courses_count })} />
              )}
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main column */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* About */}
            {(trainer.bio || trainer.short_description) && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{t('trainer.about')}</h2>
                <div className="flex flex-col gap-3 text-gray-600 leading-relaxed">
                  {trainer.short_description && (
                    <p className="font-medium text-gray-800">{trainer.short_description}</p>
                  )}
                  {trainer.bio && (
                    <p className="whitespace-pre-line">{trainer.bio}</p>
                  )}
                </div>
              </section>
            )}

            {/* Courses */}
            <section>
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-xl font-bold text-gray-900">
                  {t('trainer.courses')}
                  {coursesData?.count > 0 && (
                    <span className="text-gray-400 font-normal text-base ml-2">({coursesData.count})</span>
                  )}
                </h2>
              </div>
              {coursesLoading ? (
                <Loader text={t('trainer.loading_courses')} />
              ) : courses.length > 0 ? (
                <>
                  <div className="flex flex-col gap-4">
                    {courses.map((course) => (
                      <TrainerCourseCard key={course.id} course={course} />
                    ))}
                  </div>
                  <Pagination currentPage={coursesPage} totalPages={totalCoursePages} onPageChange={setCoursesPage} />
                </>
              ) : (
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 text-center">
                  <p className="text-gray-500">{t('trainer.no_courses')}</p>
                </div>
              )}
            </section>

          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">

            {/* Video */}
            {trainer.intro_video_url && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="aspect-[4/5] relative bg-gray-900">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      title={t('trainer.intro_video')}
                    />
                  ) : (
                    <>
                      <video
                        controls
                        className="w-full h-full object-cover"
                        src={trainer.intro_video_url}
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-xl border-4 border-red-500/30">
                          <Play className="w-8 h-8 text-white fill-white ml-1" />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-linear-to-t from-black/70 to-transparent pointer-events-none">
                    <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block">
                      {t('trainer.intro_video')}
                    </span>
                    <p className="text-white font-bold text-sm leading-snug">{fullName}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Certificates */}
            {trainer.certificates?.length > 0 && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-bg-main" />
                  {t('trainer.certificates')}
                </h2>
                <ul className="flex flex-col gap-4">
                  {trainer.certificates.map((cert, i) => {
                    const label = typeof cert === 'string' ? cert : cert?.name || cert?.title || ''
                    const sub = typeof cert === 'object' ? cert?.issuer || cert?.year || '' : ''
                    return (
                      <li key={i} className="flex items-start gap-3">
                        <div className="bg-green-50 p-1.5 rounded-full border border-green-100 shrink-0 mt-0.5">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm leading-snug">{label}</p>
                          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {/* Instagram */}
            {trainer.instagram_url && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">{t('trainer.contact')}</h2>
                <a
                  href={trainer.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3 px-4 rounded-xl hover:opacity-90 transition-all shadow-md shadow-pink-200"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6)' }}
                >
                  <Instagram className="w-5 h-5" />
                  Instagram
                </a>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

const LEVEL_LABELS = { beginner: 'Новичок', intermediate: 'Средний', advanced: 'Продвинутый' }
const FORMAT_LABELS = { home: 'Дома', gym: 'В зале', mixed: 'Смешанный' }

function toCoverPreview(url) {
  if (!url) return null
  const match = url.match(/\/file\/d\/([^/]+)/)
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`
  return url
}

function TrainerCourseCard({ course }) {
  const cover = toCoverPreview(course.cover_url)
  const level = LEVEL_LABELS[course.level]
  const format = FORMAT_LABELS[course.format]

  return (
    <Link
      to={`/courses/${course.id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 flex flex-col sm:flex-row h-auto sm:h-55"
    >
      {/* Image */}
      <div className="w-full sm:w-[38%] aspect-4/3 sm:aspect-auto relative bg-bg-main/20 shrink-0 overflow-hidden">
        {cover ? (
          <img
            src={cover}
            alt={course.title}
            className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 group-hover:opacity-100 transition-all duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-bg-main to-bg-header" />
        )}
        {course.is_purchased && (
          <div className="absolute top-3 left-3">
            <span className="bg-bg-main text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Куплено
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 sm:p-6">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {level && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-semibold uppercase tracking-wider">
              {level}
            </span>
          )}
          {format && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-semibold uppercase tracking-wider">
              {format}
            </span>
          )}
        </div>

        <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug group-hover:text-bg-main transition-colors line-clamp-2 mb-2">
          {course.title}
        </h3>

        {course.short_description && (
          <p className="text-gray-500 text-sm line-clamp-2 mb-auto">
            {course.short_description}
          </p>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div className="flex flex-col">
            <span className="text-base font-bold text-gray-900">
              {course.price ? `${Number(course.price).toLocaleString('ru-RU')} UZS` : ''}
            </span>
            {course.enrolled_count > 0 && (
              <span className="text-xs text-gray-400">{course.enrolled_count} учеников</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-bg-main font-semibold text-sm group-hover:translate-x-1 transition-transform">
            <span>Посмотреть</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  )
}

function Badge({ icon, text }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 text-sm font-medium">
      {icon}
      <span>{text}</span>
    </div>
  )
}

export default TrainerDetail

