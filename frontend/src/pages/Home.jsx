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

function SectionHeading({ label, title, subtitle }) {
  return (
    <div className="mb-8 sm:mb-10">
      {label && (
        <span className="inline-block text-xs font-semibold tracking-widest uppercase text-bg-main mb-2">
          {label}
        </span>
      )}
      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">{title}</h2>
      {subtitle && <p className="mt-2 text-gray-500 text-base">{subtitle}</p>}
    </div>
  )
}

function Home() {
  const { t } = useTranslation()
  const { data: trainers = [], isLoading: trainersLoading } = useGetTrainersQuery()
  const { data: categories = [], isLoading: categoriesLoading } = useGetCategoriesQuery()

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
    <div className="min-h-screen bg-gray-50">

      {/* Banner */}
      <section className="px-4 sm:px-6 lg:px-8 pt-6 pb-0 max-w-7xl mx-auto">
        <BannerCarousel />
      </section>

      {/* Trainers */}
      <section className="bg-white mt-10 py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
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
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
              {trainers.map((trainer) => (
                <TrainerCard key={trainer.id} trainer={trainer} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Courses */}
      <section
        id="courses-section"
        ref={coursesRef}
        className="bg-gray-50 py-14 px-4 sm:px-6 lg:px-8 scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            label={t('home.courses_label')}
            title={t('home.courses')}
            subtitle={t('home.courses_subtitle')}
          />

          {/* Category tabs */}
          {!categoriesLoading && categories.length > 0 && (
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 -mx-2 px-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                    selectedCategory === cat.id
                      ? 'bg-bg-main text-white border-bg-main shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-bg-main/40 hover:text-bg-main'
                  }`}
                >
                  {cat.title}
                </button>
              ))}
            </div>
          )}

          {/* Courses grid */}
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
              <div className="mt-8">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          )}
        </div>
      </section>

    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="py-16 text-center">
      <p className="text-gray-400 text-base">{text}</p>
    </div>
  )
}

export default Home
