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

function Home() {
  const { t } = useTranslation()
  const { data: trainers = [], isLoading: trainersLoading } = useGetTrainersQuery()
  const { data: categories = [], isLoading: categoriesLoading } = useGetCategoriesQuery()

  const [searchParams, setSearchParams] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState(null)
  const [page, setPage] = useState(1)
  const coursesRef = useRef(null)

  // Выбираем первую категорию по умолчанию
  const selectedCategory = activeCategory || categories[0]?.id || null

  // Запрос курсов с серверной фильтрацией и пагинацией
  const { data: coursesData, isLoading: coursesLoading } = useGetCoursesQuery({
    page,
    category: selectedCategory,
  })

  const courses = coursesData?.results || []
  const totalPages = coursesData ? Math.ceil(coursesData.count / 15) : 1

  // Сброс категории и скролл наверх при переходе на «Главная»
  useEffect(() => {
    if (!searchParams.get('category')) {
      setActiveCategory(null)
      setPage(1)
      window.scrollTo({ top: 0 })
    }
  }, [searchParams])

  // Активируем категорию когда данные загрузились
  useEffect(() => {
    const slug = searchParams.get('category')
    if (slug && categories.length > 0) {
      const found = categories.find((c) => c.slug === slug)
      if (found) setActiveCategory(found.id)
    }
  }, [searchParams, categories])

  // Скролл к курсам после установки категории и полной загрузки DOM
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
    <div className="flex flex-col gap-10">
      {/* Баннер */}
      <section>
        <BannerCarousel />
      </section>

      {/* Тренеры */}
      <section>
        <h2 className="text-2xl font-bold mb-4">{t('home.our_trainers')}</h2>
        {trainersLoading ? (
          <Loader text={t('home.loading_trainers')} />
        ) : trainers.length === 0 ? (
          <p className="opacity-70">{t('home.no_trainers')}</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {trainers.map((trainer) => (
              <TrainerCard key={trainer.id} trainer={trainer} />
            ))}
          </div>
        )}
      </section>

      {/* Категории + Курсы */}
      <section ref={coursesRef} className="scroll-mt-16">
        <h2 className="text-2xl font-bold mb-4">{t('home.courses')}</h2>

        {categoriesLoading ? (
          <Loader text={t('home.loading_categories')} />
        ) : categories.length === 0 ? (
          <p className="opacity-70">{t('home.no_categories')}</p>
        ) : (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-text-header text-bg-header'
                    : 'bg-bg-header/50 text-text-header hover:bg-bg-header/70'
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
          <p className="opacity-70">{t('home.no_courses_in_category')}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </section>
    </div>
  )
}

export default Home
