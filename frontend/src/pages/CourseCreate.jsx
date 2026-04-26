import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import StepIndicator from '../components/courseCreate/StepIndicator'
import Step1BasicInfo from '../components/courseCreate/Step1BasicInfo'
import Step2Training from '../components/courseCreate/Step2Training'
import { DEFAULT_VARIANTS } from '../components/courseCreate/Step2Training'
import Step3Modules from '../components/courseCreate/Step3Modules'
import StepTip from '../components/courseCreate/StepTip'
import {
  useCreateCourseMutation,
  useUpdateCourseMutation,
  usePublishCourseMutation,
  useSaveTrainingVariantMutation,
  useUpdateTrainingVariantMutation,
  useGetCategoriesQuery,
  useGetTrainerCourseQuery,
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
  const priorityMap = { training: 5, theory: 4, nutrition: 3, recovery: 2, sports_nutrition: 1, training_nuances: 0 }
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

function buildVariantsFromApi(apiVariants) {
  const result = DEFAULT_VARIANTS.map((def) => {
    const saved = apiVariants.find((v) => v.variant_number === def.variant_number)
    if (!saved) return def
    return {
      ...def,
      active: true,
      savedId: saved.id,
      name: saved.name || '',
      description: saved.description || '',
      weeks: (saved.weeks || []).map((w) => ({
        id: w.id,
        week_number: w.week_number,
        days: (w.days || []).map((d) => ({
          id: d.id,
          day_of_week: d.day_of_week,
          is_rest_day: d.is_rest_day,
          videos: (d.contents || [])
            .filter((c) => c.content_type === 'video' && c.vimeo_video)
            .map((c) => ({ vimeo_video_id: c.vimeo_video.id, title: c.vimeo_video.title })),
          files: (d.contents || [])
            .filter((c) => (c.content_type === 'pdf' || c.content_type === 'image') && c.gdrive_file)
            .map((c) => ({ gdrive_file_id: c.gdrive_file.id, filename: c.gdrive_file.filename, mime_type: c.gdrive_file.mime_type })),
        })),
      })),
    }
  })
  return result
}

export default function CourseCreate() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id: editId } = useParams()

  const [step, setStep] = useState(1)
  const [courseId, setCourseId] = useState(editId || null)
  const [step1Data, setStep1Data] = useState(INITIAL_STEP1)
  const [variants, setVariants] = useState(DEFAULT_VARIANTS)
  const [moduleContents, setModuleContents] = useState({})
  const [step1Errors, setStep1Errors] = useState({})
  const [globalError, setGlobalError] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: categories = [] } = useGetCategoriesQuery()
  const { data: existingCourse } = useGetTrainerCourseQuery(editId, { skip: !editId })

  useEffect(() => {
    if (!existingCourse) return
    const moduleTypes = (existingCourse.modules || []).map((m) => m.type)
    setStep1Data({
      category: existingCourse.category || '',
      title: existingCourse.title || '',
      short_description: existingCourse.short_description || '',
      full_description: existingCourse.full_description || '',
      modules: moduleTypes.length ? moduleTypes : ['training'],
      level: existingCourse.level || 'beginner',
      format: existingCourse.format || 'gym',
      target_weight_range: existingCourse.target_weight_range || '',
      language: existingCourse.language || 'ru',
      price: existingCourse.price || '',
      duration_weeks: existingCourse.duration_weeks || 4,
      equipment: existingCourse.equipment || '',
      requirements: existingCourse.requirements || '',
      goals_text: existingCourse.goals_text || '',
    })
    const hasVariants = existingCourse.training_variants?.length > 0
    if (hasVariants) {
      setVariants(buildVariantsFromApi(existingCourse.training_variants))
    }
    const hasExtra = moduleTypes.some((m) => m !== 'training')
    setStep(hasVariants && hasExtra ? 3 : 2)
  }, [existingCourse])

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
    if (!data.price || Number(data.price) < 300000) errors.price = t('create.validate_price')
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
    setSaving(true)
    setGlobalError('')
    try {
      if (step === 2) {
        const activeVariants = variants.filter((v) => v.active)
        for (const variant of activeVariants) {
          const draftVariant = {
            ...variant,
            name: variant.name.trim() || `Вариант ${variant.variant_number}`,
          }
          const payload = buildVariantPayload(draftVariant, courseId)
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
      }
      navigate('/profile')
    } catch (err) {
      setGlobalError(err?.data?.detail || JSON.stringify(err?.data) || t('create.error_save'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{t('create.title')}</h1>
          <p className="text-white/50 text-sm">{t('create.subtitle')}</p>
        </div>
        <Link
          to="/trainer/faq"
          className="shrink-0 flex items-center gap-1.5 text-xs text-white/40 hover:text-amber-300 transition-colors mt-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Инструкция
        </Link>
      </div>

      <StepIndicator currentStep={step} totalSteps={totalSteps} />

      <div className="bg-bg-header border border-white/10 rounded-2xl p-6 mb-6">
        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold text-white mb-5">{t('create.block1')}</h2>
            <StepTip tips={[
              'Название курса — конкретное и понятное. Пример: «Похудение за 4 недели дома» вместо «Мой курс».',
              'Краткое описание — 1–2 предложения о главном результате, который получит ученик.',
              'Выбирайте только те модули, которые планируете заполнить. Пустые модули не будут видны ученикам.',
              'Минимальная цена — 300 000 сум.',
            ]} />
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
            <StepTip tips={[
              'Вариант 1 обязателен. Варианты 2 и 3 — если хотите предложить разные программы (например, «Дома» и «В зале»).',
              'Каждая неделя содержит 7 дней. Отметьте дни отдыха переключателем — тогда видео для них не нужны.',
              'Если видео сняты вперемежку — создайте таблицу: какое видео для какой недели и дня, затем загружайте по порядку.',
              'В один день можно добавить несколько видео (например, разминка + тренировка + заминка).',
              'Порядок видео в дне = порядок загрузки. Если ошиблись — удалите и загрузите заново.',
            ]} />
            <Step2Training variants={variants} onChange={setVariants} />
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-lg font-semibold text-white mb-5">{t('create.block3')}</h2>
            <StepTip tips={[
              'Теория — вводные видео, объяснения техники упражнений, инструкции.',
              'Питание / Спортивное питание — загрузите план питания в PDF или таблицу калорий.',
              'Восстановление — видео растяжки, рекомендации по восстановлению в PDF.',
              'В каждый модуль можно добавить до 20 файлов и видео.',
              'Эти материалы ученик видит в отдельных вкладках на странице курса.',
            ]} />
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
