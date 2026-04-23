import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import StepIndicator from '../components/courseCreate/StepIndicator'
import Step1BasicInfo from '../components/courseCreate/Step1BasicInfo'
import Step2Training from '../components/courseCreate/Step2Training'
import { DEFAULT_VARIANTS } from '../components/courseCreate/Step2Training'
import Step3Modules from '../components/courseCreate/Step3Modules'
import {
  useCreateCourseMutation,
  useUpdateCourseMutation,
  usePublishCourseMutation,
  useSaveTrainingVariantMutation,
  useUpdateTrainingVariantMutation,
  useGetCategoriesQuery,
} from '../app/api/courseCreateApi'

const INITIAL_STEP1 = {
  category: '',
  title: '',
  short_description: '',
  full_description: '',
  modules: ['training'],
  level: 'beginner',
  format: 'gym',
  target_weight_range: '',
  language: 'ru',
  price: '',
  duration_weeks: 4,
  equipment: '',
  requirements: '',
  goals_text: '',
}

function buildModulesPayload(moduleTypes) {
  const priorityMap = { training: 5, theory: 4, nutrition: 3, recovery: 2 }
  return moduleTypes.map((type) => ({
    type,
    priority: priorityMap[type] ?? 1,
  }))
}

function buildVariantPayload(variant, courseId) {
  return {
    course: courseId,
    variant_number: variant.variant_number,
    name: variant.name,
    description: variant.description,
    weeks: variant.weeks.map((week) => ({
      ...(week.id ? { id: week.id } : {}),
      week_number: week.week_number,
      days: week.days.map((day) => {
        const contents = []
        let order = 1
        for (const v of day.videos || []) {
          contents.push({
            title: v.title || 'Видео',
            order: order++,
            content_type: 'video',
            vimeo_video: v.vimeo_video_id,
          })
        }
        for (const f of day.files || []) {
          const ct = f.mime_type === 'application/pdf' ? 'pdf' : 'image'
          contents.push({
            title: f.filename || 'Файл',
            order: order++,
            content_type: ct,
            gdrive_file: f.gdrive_file_id,
          })
        }
        return {
          ...(day.id ? { id: day.id } : {}),
          day_of_week: day.day_of_week,
          is_rest_day: day.is_rest_day,
          contents,
        }
      }),
    })),
  }
}

export default function CourseCreate() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [courseId, setCourseId] = useState(null)
  const [step1Data, setStep1Data] = useState(INITIAL_STEP1)
  const [variants, setVariants] = useState(DEFAULT_VARIANTS)
  const [moduleContents, setModuleContents] = useState({})
  const [step1Errors, setStep1Errors] = useState({})
  const [globalError, setGlobalError] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: categories = [] } = useGetCategoriesQuery()

  const [createCourse] = useCreateCourseMutation()
  const [updateCourse] = useUpdateCourseMutation()
  const [publishCourse] = usePublishCourseMutation()
  const [saveVariant] = useSaveTrainingVariantMutation()
  const [updateVariant] = useUpdateTrainingVariantMutation()

  const hasExtraModules = step1Data.modules.some((m) => m !== 'training')
  const totalSteps = hasExtraModules ? 3 : 2

  function validate1(data) {
    const errors = {}
    if (!data.category) errors.category = t('create.validate_category')
    if (!data.title.trim()) errors.title = t('create.validate_title')
    if (!data.short_description.trim()) errors.short_description = t('create.validate_desc')
    if (!data.price || Number(data.price) < 0) errors.price = t('create.validate_price')
    return errors
  }

  async function handleStep1Next() {
    const errors = validate1(step1Data)
    if (Object.keys(errors).length > 0) {
      setStep1Errors(errors)
      return
    }
    setStep1Errors({})
    setSaving(true)
    setGlobalError('')

    try {
      const payload = {
        ...step1Data,
        price: Number(step1Data.price),
        duration_weeks: Number(step1Data.duration_weeks),
        modules: buildModulesPayload(step1Data.modules),
      }
      delete payload.modules_ui

      if (courseId) {
        await updateCourse({ id: courseId, ...payload }).unwrap()
      } else {
        const result = await createCourse(payload).unwrap()
        setCourseId(result.id)
      }
      setStep(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setGlobalError(
        err?.data?.detail || JSON.stringify(err?.data) || t('create.error_save')
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleStep2Next() {
    if (!courseId) return
    setSaving(true)
    setGlobalError('')

    try {
      const activeVariants = variants.filter((v) => v.active)
      for (const variant of activeVariants) {
        if (!variant.name.trim()) {
          setGlobalError(t('create.error_variant_name', { number: variant.variant_number }))
          setSaving(false)
          return
        }
        const payload = buildVariantPayload(variant, courseId)
        if (variant.savedId) {
          await updateVariant({ id: variant.savedId, ...payload }).unwrap()
        } else {
          const result = await saveVariant(payload).unwrap()
          setVariants((prev) =>
            prev.map((v) =>
              v.variant_number === variant.variant_number
                ? { ...v, savedId: result.id }
                : v
            )
          )
        }
      }

      if (hasExtraModules) {
        setStep(3)
      } else {
        await handlePublish()
        return
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setGlobalError(
        err?.data?.detail || JSON.stringify(err?.data) || t('create.error_variants')
      )
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!courseId) return
    setSaving(true)
    setGlobalError('')
    try {
      await publishCourse({ id: courseId, action: 'publish' }).unwrap()
      navigate('/profile?submitted=1')
    } catch (err) {
      setGlobalError(err?.data?.detail || t('create.error_publish'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveDraft() {
    if (!courseId) return
    navigate(`/courses/${courseId}`)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">{t('create.title')}</h1>
        <p className="text-white/50 text-sm">{t('create.subtitle')}</p>
      </div>

      <StepIndicator currentStep={step} totalSteps={totalSteps} />

      <div className="bg-bg-header border border-white/10 rounded-2xl p-6 mb-6">
        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold text-white mb-5">{t('create.block1')}</h2>
            <Step1BasicInfo
              data={step1Data}
              onChange={setStep1Data}
              errors={step1Errors}
              categories={categories}
            />
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold text-white mb-5">{t('create.block2')}</h2>
            <Step2Training variants={variants} onChange={setVariants} />
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-lg font-semibold text-white mb-5">{t('create.block3')}</h2>
            <Step3Modules
              selectedModuleTypes={step1Data.modules}
              modules={moduleContents}
              onChange={setModuleContents}
            />
          </>
        )}
      </div>

      {globalError && (
        <div className="mb-4 px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-xl">
          <p className="text-red-400 text-sm">{globalError}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium text-white/70 hover:text-white bg-white/10 hover:bg-white/15 rounded-xl transition-colors disabled:opacity-50"
            >
              {t('create.back')}
            </button>
          )}
          {courseId && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium text-white/50 hover:text-white/80 transition-colors disabled:opacity-50"
            >
              {t('create.save_draft')}
            </button>
          )}
        </div>

        <div className="flex gap-3">
          {step === 1 && (
            <button
              type="button"
              onClick={handleStep1Next}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold bg-main hover:bg-main/90 text-white rounded-xl transition-colors disabled:opacity-60 min-w-30"
            >
              {saving ? t('create.saving') : t('create.next')}
            </button>
          )}

          {step === 2 && (
            <button
              type="button"
              onClick={handleStep2Next}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold bg-main hover:bg-main/90 text-white rounded-xl transition-colors disabled:opacity-60 min-w-40"
            >
              {saving
                ? t('create.saving')
                : hasExtraModules
                ? t('create.next')
                : t('create.submit')}
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold bg-green-600 hover:bg-green-500 text-white rounded-xl transition-colors disabled:opacity-60 min-w-45"
            >
              {saving ? t('create.submitting') : t('create.submit')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
