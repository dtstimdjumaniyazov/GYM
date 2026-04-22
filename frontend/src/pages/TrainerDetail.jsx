import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGetTrainerQuery } from '../app/api/trainersApi'
import { useGetCoursesQuery } from '../app/api/coursesApi'
import CourseCard from '../components/CourseCard'
import Pagination from '../components/Pagination'
import Loader from '../components/Loader'

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
  const { data: coursesData, isLoading: coursesLoading } = useGetCoursesQuery(
    { page: coursesPage, trainer: id },
  )
  const courses = coursesData?.results || []
  const totalCoursePages = coursesData ? Math.ceil(coursesData.count / 15) : 1

  if (isLoading) return <Loader text={t('trainer.loading')} />

  if (error || !trainer) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-text-header mb-4">{t('trainer.not_found')}</h2>
        <Link to="/" className="text-link-hover hover:underline">{t('common.back_to_home')}</Link>
      </div>
    )
  }

  const photoSrc = toDirectUrl(trainer.photo_url)
  const fullName = `${trainer.first_name} ${trainer.last_name}`.trim()

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* ─── Hero Block ─────────────────────────────── */}
      <section className="bg-bg-header/60 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Photo */}
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={fullName}
              className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover shrink-0 ring-4 ring-link-hover/30"
            />
          ) : (
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-bg-main/40 flex items-center justify-center text-5xl font-bold text-text-header shrink-0">
              {trainer.first_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}

          {/* Info */}
          <div className="flex flex-col gap-3 text-center sm:text-left">
            <h1 className="text-3xl font-bold text-text-header">{fullName}</h1>

            {trainer.short_description && (
              <p className="text-text-primary text-lg">{trainer.short_description}</p>
            )}

            {trainer.specialization && (
              <p className="text-link-hover">{trainer.specialization}</p>
            )}

            <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-sm">
              {trainer.experience_years > 0 && (
                <span className="bg-bg-main/40 text-text-header px-3 py-1.5 rounded-full">
                  {t('trainer.experience', { years: trainer.experience_years })}
                </span>
              )}
              {trainer.courses_count > 0 && (
                <span className="bg-bg-main/40 text-text-header px-3 py-1.5 rounded-full">
                  {t('trainer.courses_count', { count: trainer.courses_count })}
                </span>
              )}
              {trainer.certificates?.length > 0 && (
                <span className="bg-bg-main/40 text-text-header px-3 py-1.5 rounded-full">
                  {t('trainer.certificates_count', { count: trainer.certificates.length })}
                </span>
              )}
            </div>

            {trainer.instagram_url && (
              <a
                href={trainer.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-pink-400 hover:text-pink-300 transition-colors text-sm w-fit"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                </svg>
                {trainer.instagram_url.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, '')}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ─── About ──────────────────────────────────── */}
      {trainer.bio && (
        <section>
          <h2 className="text-xl font-bold text-text-header mb-4">{t('trainer.about')}</h2>
          <div className="bg-bg-header/60 rounded-2xl p-6">
            <p className="text-text-primary whitespace-pre-line leading-relaxed">{trainer.bio}</p>
          </div>
        </section>
      )}

      {/* ─── Intro Video ────────────────────────────── */}
      {trainer.intro_video_url && (
        <section>
          <h2 className="text-xl font-bold text-text-header mb-4">{t('trainer.intro_video')}</h2>
          {getEmbedUrl(trainer.intro_video_url) ? (
            <div className="rounded-2xl overflow-hidden aspect-video">
              <iframe
                src={getEmbedUrl(trainer.intro_video_url)}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={t('trainer.intro_video')}
              />
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden bg-black">
              <video
                controls
                className="w-full max-h-120"
                src={trainer.intro_video_url}
              >
                {t('trainer.video_not_supported')}
              </video>
            </div>
          )}
        </section>
      )}

      {/* ─── Certificates ───────────────────────────── */}
      {trainer.certificates?.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-text-header mb-4">{t('trainer.certificates')}</h2>
          <div className="bg-bg-header/60 rounded-2xl p-6">
            <ul className="flex flex-col gap-2">
              {trainer.certificates.map((cert, i) => (
                <li key={i} className="text-text-primary flex items-start gap-2">
                  <span className="text-link-hover mt-0.5">&#10003;</span>
                  <span>{cert}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ─── Trainer's Courses ──────────────────────── */}
      <section>
        <h2 className="text-xl font-bold text-text-header mb-4">
          {t('trainer.courses')}
          {coursesData?.count > 0 && (
            <span className="text-text-primary font-normal text-base ml-2">({coursesData.count})</span>
          )}
        </h2>

        {coursesLoading ? (
          <Loader text={t('trainer.loading_courses')} />
        ) : courses.length > 0 ? (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
            <Pagination
              currentPage={coursesPage}
              totalPages={totalCoursePages}
              onPageChange={setCoursesPage}
            />
          </>
        ) : (
          <div className="bg-bg-header/60 rounded-2xl p-8 text-center">
            <p className="text-text-primary">{t('trainer.no_courses')}</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default TrainerDetail
