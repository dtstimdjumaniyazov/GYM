import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useGetTrainersQuery } from '../app/api/trainersApi'
import { useGetCoursesQuery, useGetCategoriesQuery } from '../app/api/coursesApi'
import TrainerCard from '../components/TrainerCard'
import CourseCard from '../components/CourseCard'
import Pagination from '../components/Pagination'
import Loader from '../components/Loader'
import BannerCarousel from '../components/BannerCarousel'
import { useTranslation } from 'react-i18next'

/* MainLayout adds px-3…px-8 + py-4. We cancel top padding and
   break out horizontally to achieve true full-bleed for the hero. */
const BLEED = '-mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8'

function Home() {
  const { t } = useTranslation()
  const { data: trainers = [], isLoading: trainersLoading } = useGetTrainersQuery()
  const { data: categories = [], isLoading: categoriesLoading } = useGetCategoriesQuery()
  const { data: allCoursesData } = useGetCoursesQuery({ page: 1 })

  const [searchParams, setSearchParams] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState(null)
  const [page, setPage] = useState(1)
  const coursesRef = useRef(null)

  const selectedCategory = activeCategory || categories[0]?.id || null

  const { data: coursesData, isLoading: coursesLoading } = useGetCoursesQuery({
    page,
    category: selectedCategory,
  })

  const courses = coursesData?.results || []
  const totalPages = coursesData ? Math.ceil(coursesData.count / 15) : 1

  useEffect(() => {
    if (!searchParams.get('category')) {
      setActiveCategory(null)
      setPage(1)
      window.scrollTo({ top: 0 })
    }
  }, [searchParams])

  useEffect(() => {
    const slug = searchParams.get('category')
    if (slug && categories.length > 0) {
      const found = categories.find((c) => c.slug === slug)
      if (found) setActiveCategory(found.id)
    }
  }, [searchParams, categories])

  useEffect(() => {
    if (searchParams.get('category') && activeCategory && !categoriesLoading && !trainersLoading && !coursesLoading) {
      const timer = setTimeout(() => {
        coursesRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' })
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [searchParams, activeCategory, categoriesLoading, trainersLoading, coursesLoading])

  const handleCategoryClick = (cat) => {
    setActiveCategory(cat.id)
    setPage(1)
    setSearchParams({ category: cat.slug })
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
    coursesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="-mt-4">

      {/* ── Hero: full-bleed dark block ─────────────────────────── */}
      <div className={`${BLEED} bg-bg-header`}>

        {/* Banner — no rounding, fills the dark block */}
        <BannerCarousel className="" />

        {/* Stats strip — seamlessly attached below banner */}
        {!trainersLoading && !categoriesLoading && (
          <div className="border-t border-white/10">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-3 divide-x divide-white/10">
              <StatCell value={allCoursesData?.count ?? '—'} label={t('home.stat_courses')} />
              <StatCell value={trainers.length || '—'} label={t('home.stat_trainers')} />
              <StatCell value={categories.length || '—'} label={t('home.stat_categories')} />
            </div>
          </div>
        )}
      </div>

      {/* ── Trainers: white section ─────────────────────────────── */}
      <div className={`${BLEED} bg-white border-b border-gray-100`}>
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <SectionHeading
            label={t('home.trainers_label')}
            title={t('home.our_trainers')}
            subtitle={t('home.trainers_subtitle')}
          />
          {trainersLoading ? (
            <Loader text={t('home.loading_trainers')} />
          ) : trainers.length === 0 ? (
            <EmptyState text={t('home.no_trainers')} />
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
              {trainers.map((trainer) => (
                <TrainerCard key={trainer.id} trainer={trainer} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Courses: gray section ───────────────────────────────── */}
      <div className={`${BLEED} bg-gray-50`}>
        <section
          id="courses-section"
          ref={coursesRef}
          className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20 scroll-mt-16"
        >
          <SectionHeading
            label={t('home.courses_label')}
            title={t('home.courses')}
            subtitle={t('home.courses_subtitle')}
          />

          {!categoriesLoading && categories.length > 0 && (
            <div className="flex gap-2 mb-10 overflow-x-auto pb-2 -mx-1 px-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                    selectedCategory === cat.id
                      ? 'bg-bg-main text-white border-bg-main shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-bg-main/50 hover:text-bg-main'
                  }`}
                >
                  {cat.title}
                </button>
              ))}
            </div>
          )}

          {coursesLoading ? (
            <Loader text={t('home.loading_courses')} />
          ) : courses.length === 0 ? (
            <EmptyState text={t('home.no_courses_in_category')} />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
              <div className="mt-10">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          )}
        </section>
      </div>

    </div>
  )
}

/* ── Shared components ──────────────────────────────────────── */

function SectionHeading({ label, title, subtitle }) {
  return (
    <div className="mb-8 sm:mb-10">
      {label && (
        <span className="inline-block text-xs font-bold tracking-widest uppercase text-bg-main mb-2">
          {label}
        </span>
      )}
      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">{title}</h2>
      {subtitle && <p className="mt-2 text-gray-500 text-base max-w-lg">{subtitle}</p>}
    </div>
  )
}

function StatCell({ value, label }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-1">
      <span className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">{value}</span>
      <span className="text-xs sm:text-sm text-white/50 text-center">{label}</span>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="py-20 text-center">
      <p className="text-gray-400 text-base">{text}</p>
    </div>
  )
}

export default Home
