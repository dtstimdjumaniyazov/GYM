import { useState, useCallback, useRef, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useGetCourseQuery, useGetCourseLessonsQuery } from '../app/api/coursesApi'
import {
  useGetEnrollmentQuery,
  useSetVariantMutation,
  useGetProgressQuery,
  useUpdateProgressMutation,
} from '../app/api/enrollmentsApi'
import { useGetTrainingScheduleQuery } from '../app/api/trainingApi'
import VimeoPlayer from '../components/VimeoPlayer'
import FileViewerModal from '../components/FileViewerModal'
import Loader from '../components/Loader'
import { useTranslation } from 'react-i18next'

const MODULE_ICONS = {
  training: '💪',
  theory: '🧠',
  nutrition: '🥗',
  recovery: '🧘',
}

const MODULE_ORDER = ['training', 'theory', 'nutrition', 'recovery']

const DAY_LABELS = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
  7: 'Воскресенье',
}

const DAY_LABELS_UZ = {
  1: 'Dushanba',
  2: 'Seshanba',
  3: 'Chorshanba',
  4: 'Payshanba',
  5: 'Juma',
  6: 'Shanba',
  7: 'Yakshanba',
}

function CourseLessons() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const { data: course, isLoading: courseLoading } = useGetCourseQuery(id, { refetchOnMountOrArgChange: true })
  const { data: lessonsData, isLoading: lessonsLoading } = useGetCourseLessonsQuery(id, { refetchOnMountOrArgChange: true })
  const { data: trainingData, isLoading: trainingLoading } = useGetTrainingScheduleQuery(id, { refetchOnMountOrArgChange: true })

  const isPurchased = course?.is_purchased
  const { data: enrollment, isLoading: enrollmentLoading } = useGetEnrollmentQuery(id, {
    skip: !isPurchased,
  })
  const { data: progressData } = useGetProgressQuery(id, { skip: !isPurchased })
  const [updateProgress] = useUpdateProgressMutation()

  const [activeTab, setActiveTab] = useState(null)
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [activeVideo, setActiveVideo] = useState(null)
  const [activeFile, setActiveFile] = useState(null)

  const [setVariant, { isLoading: settingVariant }] = useSetVariantMutation()

  const MODULE_LABELS = {
    training: t('course.module_training'),
    theory: t('course.module_theory'),
    nutrition: t('course.module_nutrition'),
    recovery: t('course.module_recovery'),
  }

  const dayLabels = i18n.language === 'uz' ? DAY_LABELS_UZ : DAY_LABELS

  const progressMap = useMemo(() => {
    const map = {}
    for (const p of progressData || []) {
      map[p.content_id] = p
    }
    return map
  }, [progressData])

  const lastSavedPercentRef = useRef(0)
  const latestPercentRef = useRef(0)

  const saveProgress = useCallback(
    (watchPercent) => {
      if (!activeVideo || !isPurchased) return
      updateProgress({
        courseId: id,
        content_id: activeVideo.id,
        content_type: activeVideo.contentType,
        watch_percent: watchPercent,
      })
      lastSavedPercentRef.current = watchPercent
    },
    [activeVideo, isPurchased, id, updateProgress],
  )

  const handleTimeUpdate = useCallback(
    (data) => {
      const percent = Math.round(data.percent * 100)
      latestPercentRef.current = percent
      const shouldSave =
        percent - lastSavedPercentRef.current >= 5 ||
        (percent >= 84 && lastSavedPercentRef.current < 84)
      if (shouldSave) {
        saveProgress(percent)
      }
    },
    [saveProgress],
  )

  const handleVideoEnded = useCallback(() => {
    saveProgress(100)
  }, [saveProgress])

  const handleCloseVideo = useCallback(() => {
    if (activeVideo && isPurchased && latestPercentRef.current > lastSavedPercentRef.current) {
      updateProgress({
        courseId: id,
        content_id: activeVideo.id,
        content_type: activeVideo.contentType,
        watch_percent: latestPercentRef.current,
      })
    }
    latestPercentRef.current = 0
    lastSavedPercentRef.current = 0
    setActiveVideo(null)
  }, [activeVideo, isPurchased, id, updateProgress])

  const isLoading = courseLoading || lessonsLoading || trainingLoading || (isPurchased && enrollmentLoading)
  if (isLoading) return <Loader text={t('lessons.loading')} />

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold mb-4">{t('lessons.not_found')}</h2>
        <Link to="/" className="text-link-hover hover:underline">{t('common.back_to_home')}</Link>
      </div>
    )
  }

  const isVariantLocked = enrollment?.variant_locked
  const modules = lessonsData?.modules || []

  const sortedModules = MODULE_ORDER
    .map((type) => modules.find((m) => m.type === type))
    .filter(Boolean)

  const currentTab = activeTab || sortedModules[0]?.type
  const currentModule = sortedModules.find((m) => m.type === currentTab)

  const needsVariantSelection = isPurchased && !isVariantLocked && course.training_variants?.length > 0

  const handlePlayVideo = (content, contentType) => {
    if (!content.vimeo_video) return
    lastSavedPercentRef.current = progressMap[content.id]?.watch_percent || 0
    setActiveVideo({
      id: content.id,
      title: content.title,
      vimeoId: content.vimeo_video.vimeo_id,
      contentType,
    })
  }

  const handleOpenFile = (content, contentType) => {
    setActiveFile(content)
    if (!isPurchased) return
    updateProgress({
      courseId: id,
      content_id: content.id,
      content_type: contentType,
      watch_percent: 100,
    })
  }

  const handleVariantSelect = (variantId) => {
    setSelectedVariantId(variantId)
    setShowConfirmModal(true)
  }

  const handleConfirmVariant = async () => {
    if (!selectedVariantId) return
    try {
      await setVariant({ courseId: id, variantId: selectedVariantId }).unwrap()
      setShowConfirmModal(false)
      setShowVariantModal(false)
    } catch {
      // Error handled by RTK Query
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link to={`/courses/${id}`} className="text-link-hover text-sm hover:underline">
            {t('lessons.back_to_course')}
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-text-header mt-1">
            {course.title}
          </h1>
        </div>
        {isPurchased && !isVariantLocked && course.training_variants?.length > 0 && (
          <button
            onClick={() => setShowVariantModal(true)}
            className="bg-link-hover text-bg-header px-4 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            {t('lessons.select_program_btn')}
          </button>
        )}
      </div>

      {/* Not purchased banner */}
      {!isPurchased && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
          <p className="text-yellow-300 font-medium mb-2">
            {t('lessons.preview_banner_title')}
          </p>
          <p className="text-sm text-text-primary/70 mb-3">
            {t('lessons.preview_banner_desc')}
          </p>
          <Link
            to={`/courses/${id}`}
            className="inline-block bg-link-hover text-bg-header px-6 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            {t('lessons.buy_course')}
          </Link>
        </div>
      )}

      {/* Tab Navigation */}
      {sortedModules.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sortedModules.map((module) => {
            const isActive = currentTab === module.type
            const stars = '⭐'.repeat(module.priority)
            return (
              <button
                key={module.id}
                onClick={() => {
                  setActiveTab(module.type)
                  handleCloseVideo()
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-link-hover text-bg-header'
                    : 'bg-bg-header/50 text-text-header hover:bg-bg-header/70'
                }`}
              >
                <span>{MODULE_ICONS[module.type]}</span>
                <span>{MODULE_LABELS[module.type]}</span>
                {module.priority >= 4 && <span className="text-xs">{stars}</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Tab Content */}
      {currentTab === 'training' ? (
        <TrainingTabContent
          trainingData={trainingData}
          isPurchased={isPurchased}
          isVariantLocked={isVariantLocked}
          activeVideo={activeVideo}
          progressMap={progressMap}
          onPlayVideo={(c) => handlePlayVideo(c, 'day_content')}
          onOpenFile={(c) => handleOpenFile(c, 'day_content')}
          onCloseVideo={handleCloseVideo}
          onTimeUpdate={handleTimeUpdate}
          onVideoEnded={handleVideoEnded}
          needsVariantSelection={needsVariantSelection}
          onSelectVariant={() => setShowVariantModal(true)}
          dayLabels={dayLabels}
        />
      ) : currentModule ? (
        <ModuleTabContent
          module={currentModule}
          isPurchased={isPurchased}
          activeVideo={activeVideo}
          progressMap={progressMap}
          onPlayVideo={(c) => handlePlayVideo(c, 'module_content')}
          onOpenFile={(c) => handleOpenFile(c, 'module_content')}
          onCloseVideo={handleCloseVideo}
          onTimeUpdate={handleTimeUpdate}
          onVideoEnded={handleVideoEnded}
        />
      ) : (
        <p className="text-text-primary/70 text-center py-10">
          {t('lessons.select_module')}
        </p>
      )}

      {/* Variant Selection Modal */}
      {showVariantModal && (
        <VariantSelectionModal
          variants={course.training_variants || []}
          onSelect={handleVariantSelect}
          onClose={() => setShowVariantModal(false)}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <ConfirmModal
          variant={course.training_variants?.find((v) => v.id === selectedVariantId)}
          isLoading={settingVariant}
          onConfirm={handleConfirmVariant}
          onCancel={() => {
            setShowConfirmModal(false)
            setSelectedVariantId(null)
          }}
        />
      )}

      {/* PDF / Image Viewer Modal */}
      {activeFile && (
        <FileViewerModal
          content={activeFile}
          onClose={() => setActiveFile(null)}
        />
      )}
    </div>
  )
}

/* ─── Video Player Panel (shared) ─────────────────── */

function VideoPlayerPanel({ activeVideo, onClose, onTimeUpdate, onVideoEnded }) {
  const { t } = useTranslation()
  if (!activeVideo) return null

  return (
    <div className="lg:w-2/3">
      <div className="bg-bg-header/60 rounded-2xl overflow-hidden sticky top-20">
        <VimeoPlayer
          vimeoId={activeVideo.vimeoId}
          autoplay
          onTimeUpdate={onTimeUpdate}
          onEnded={onVideoEnded}
        />
        <div className="p-4 flex items-center justify-between">
          <h3 className="font-bold text-text-header">{activeVideo.title}</h3>
          <button
            onClick={onClose}
            className="text-sm text-link-hover hover:underline cursor-pointer"
          >
            {t('lessons.close_video')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Training Tab ─────────────────────────────────── */

function TrainingTabContent({
  trainingData,
  isPurchased,
  isVariantLocked,
  activeVideo,
  progressMap,
  onPlayVideo,
  onOpenFile,
  onCloseVideo,
  onTimeUpdate,
  onVideoEnded,
  needsVariantSelection,
  onSelectVariant,
  dayLabels,
}) {
  const { t } = useTranslation()
  const [expandedWeeks, setExpandedWeeks] = useState({})
  const [expandedDays, setExpandedDays] = useState({})

  if (!isPurchased) {
    return (
      <div className="bg-bg-header/40 rounded-2xl p-8 text-center">
        <span className="text-4xl mb-4 block">🔒</span>
        <p className="text-text-header font-medium mb-2">
          {t('lessons.training_locked_title')}
        </p>
        <p className="text-sm text-text-primary/70">
          {t('lessons.training_locked_desc')}
        </p>
      </div>
    )
  }

  if (needsVariantSelection || !isVariantLocked) {
    return (
      <div className="bg-bg-header/40 rounded-2xl p-8 text-center">
        <span className="text-4xl mb-4 block">📋</span>
        <p className="text-text-header font-medium mb-2">
          {t('lessons.select_variant_title')}
        </p>
        <p className="text-sm text-text-primary/70 mb-4">
          {t('lessons.select_variant_desc')}
        </p>
        <button
          onClick={onSelectVariant}
          className="bg-link-hover text-bg-header px-6 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          {t('lessons.select_program')}
        </button>
      </div>
    )
  }

  if (!trainingData?.variant) {
    return <Loader text={t('lessons.loading_schedule')} />
  }

  const { variant } = trainingData

  const toggleWeek = (weekId) => {
    setExpandedWeeks((prev) => ({ ...prev, [weekId]: !prev[weekId] }))
  }

  const toggleDay = (dayId) => {
    setExpandedDays((prev) => ({ ...prev, [dayId]: !prev[dayId] }))
  }

  return (
    <div className={`flex gap-6 ${activeVideo ? 'flex-col lg:flex-row' : ''}`}>
      <VideoPlayerPanel
        activeVideo={activeVideo}
        onClose={onCloseVideo}
        onTimeUpdate={onTimeUpdate}
        onVideoEnded={onVideoEnded}
      />

      {/* Schedule Tree */}
      <div className={activeVideo ? 'lg:w-1/3' : 'w-full'}>
        <div className="bg-bg-header/40 rounded-2xl p-4">
          <h3 className="font-bold text-text-header mb-3">
            {variant.name}
          </h3>
          {variant.description && (
            <p className="text-sm text-text-primary/70 mb-4">{variant.description}</p>
          )}
          <div className="flex flex-col gap-2">
            {variant.weeks?.map((week) => (
              <div key={week.id}>
                <button
                  onClick={() => toggleWeek(week.id)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-bg-header/40 rounded-lg hover:bg-bg-header/60 transition-colors cursor-pointer"
                >
                  <span className="font-medium text-text-header">
                    {t('lessons.week_label', { number: week.week_number })}
                  </span>
                  <span className={`transition-transform ${expandedWeeks[week.id] ? 'rotate-90' : ''}`}>
                    &#9654;
                  </span>
                </button>
                {expandedWeeks[week.id] && (
                  <div className="ml-4 mt-1 flex flex-col gap-1">
                    {week.days?.map((day) => (
                      <div key={day.id}>
                        <button
                          onClick={() => toggleDay(day.id)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-bg-header/40 transition-colors cursor-pointer text-sm ${
                            day.is_rest_day ? 'text-text-primary/50' : 'text-text-header'
                          }`}
                        >
                          <span>
                            {dayLabels[day.day_of_week] || `${day.day_of_week}`}
                            {day.is_rest_day && ` ${t('lessons.rest_day')}`}
                          </span>
                          {!day.is_rest_day && day.contents?.length > 0 && (
                            <span className={`transition-transform ${expandedDays[day.id] ? 'rotate-90' : ''}`}>
                              &#9654;
                            </span>
                          )}
                        </button>
                        {expandedDays[day.id] && !day.is_rest_day && (
                          <div className="ml-4 mt-1 flex flex-col gap-1">
                            {day.contents?.map((content) => (
                              <ContentItem
                                key={content.id}
                                content={content}
                                isActive={activeVideo?.id === content.id}
                                progress={progressMap[content.id]}
                                onPlayVideo={onPlayVideo}
                                onOpenFile={onOpenFile}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Module Tab (Theory/Nutrition/Recovery) ──────── */

function ModuleTabContent({
  module,
  isPurchased,
  activeVideo,
  progressMap,
  onPlayVideo,
  onOpenFile,
  onCloseVideo,
  onTimeUpdate,
  onVideoEnded,
}) {
  const { t } = useTranslation()

  if (!module.contents || module.contents.length === 0) {
    return (
      <div className="bg-bg-header/40 rounded-2xl p-8 text-center">
        <p className="text-text-primary/70">{t('lessons.no_module_content')}</p>
      </div>
    )
  }

  return (
    <div className={`flex gap-6 ${activeVideo ? 'flex-col lg:flex-row' : ''}`}>
      <VideoPlayerPanel
        activeVideo={activeVideo}
        onClose={onCloseVideo}
        onTimeUpdate={onTimeUpdate}
        onVideoEnded={onVideoEnded}
      />

      <div className={activeVideo ? 'lg:w-1/3' : 'w-full'}>
        <div className="bg-bg-header/40 rounded-2xl p-4">
          <div className="flex flex-col gap-2">
            {module.contents.map((content) => (
              <ContentItem
                key={content.id}
                content={content}
                isPurchased={isPurchased}
                isActive={activeVideo?.id === content.id}
                progress={progressMap[content.id]}
                onPlayVideo={onPlayVideo}
                onOpenFile={onOpenFile}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Content Item ─────────────────────────────────── */

function ContentItem({ content, isPurchased = true, isActive = false, progress, onPlayVideo, onOpenFile }) {
  const { t } = useTranslation()
  const isLocked = !isPurchased && !content.is_preview
  const isCompleted = progress?.is_completed
  const watchPercent = progress?.watch_percent || 0

  const icon = isCompleted
    ? '✅'
    : content.content_type === 'video'
      ? '🎥'
      : content.content_type === 'pdf'
        ? '📄'
        : '🖼️'

  const handleClick = () => {
    if (isLocked) return

    if (content.content_type === 'video' && content.vimeo_video?.vimeo_id) {
      onPlayVideo(content)
    } else if (
      (content.content_type === 'pdf' || content.content_type === 'image') &&
      content.gdrive_file?.view_url
    ) {
      onOpenFile?.(content)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLocked}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm cursor-pointer ${
        isLocked
          ? 'opacity-50 cursor-not-allowed'
          : isActive
            ? 'bg-link-hover/20 ring-1 ring-link-hover/40'
            : 'hover:bg-bg-header/50'
      }`}
    >
      <span>{icon}</span>
      <span className={`flex-1 ${isLocked ? 'text-text-primary/50' : isActive ? 'text-link-hover font-medium' : 'text-text-header'}`}>
        {content.title}
      </span>
      {content.is_preview && (
        <span className="text-xs bg-link-hover/20 text-link-hover px-2 py-0.5 rounded-full">
          {t('lessons.preview_badge')}
        </span>
      )}
      {isLocked && <span>🔒</span>}
      {!isLocked && !isCompleted && watchPercent > 0 && (
        <span className="text-xs text-link-hover font-medium">{watchPercent}%</span>
      )}
      {content.vimeo_video?.duration_formatted && (
        <span className="text-xs text-text-primary/50">{content.vimeo_video.duration_formatted}</span>
      )}
    </button>
  )
}

/* ─── Variant Selection Modal ──────────────────────── */

function VariantSelectionModal({ variants, onSelect, onClose }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-header rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-text-header mb-2">
          {t('lessons.variant_modal_title')}
        </h2>
        <p className="text-sm text-text-primary/70 mb-6">
          {t('lessons.variant_modal_desc')}
        </p>
        <h2 className="text-lg font-bold mb-2 text-red-400">{t('lessons.variant_warning')}</h2>

        <div className="flex flex-col gap-3 mb-6">
          {variants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => onSelect(variant.id)}
              className="w-full bg-bg-main/40 hover:bg-bg-main/60 rounded-xl p-4 text-left transition-colors cursor-pointer"
            >
              <div className="font-medium text-text-header">
                {variant.name}
              </div>
              {variant.description && (
                <p className="text-sm text-text-primary/70 mt-1">{variant.description}</p>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 text-text-primary/70 hover:text-text-header transition-colors cursor-pointer"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}

/* ─── Confirm Variant Modal ────────────────────────── */

function ConfirmModal({ variant, isLoading, onConfirm, onCancel }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-header rounded-2xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-text-header mb-4">
          {t('lessons.confirm_title')}
        </h2>
        <p className="text-text-primary/90 mb-2">
          {t('lessons.confirm_desc')}
        </p>
        <p className="font-bold text-text-header text-lg mb-4">
          &laquo;{variant?.name}&raquo;?
        </p>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-6">
          <p className="text-yellow-300 text-sm font-medium">
            {t('lessons.variant_locked_warning')}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 bg-link-hover text-bg-header py-3 rounded-xl font-bold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            {isLoading ? t('common.saving') : t('common.yes')}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 bg-bg-main/40 text-text-header py-3 rounded-xl font-bold hover:bg-bg-main/60 transition-colors cursor-pointer disabled:opacity-50"
          >
            {t('common.no')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CourseLessons
