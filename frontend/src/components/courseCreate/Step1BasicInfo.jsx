import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'
import { uploadFileToGDrive } from '../../app/api/courseCreateApi'

const inputCls =
  'w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-bg-main/20 focus:border-bg-main transition-colors'

const selectCls =
  'w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-bg-main/20 focus:border-bg-main transition-colors'

const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

function FieldError({ msg }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-red-600">{msg}</p>
}

function toCoverPreview(url) {
  if (!url) return null
  const match = url.match(/\/file\/d\/([^/]+)/)
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`
  return url
}

export default function Step1BasicInfo({ data, onChange, errors, categories = [] }) {
  const { t } = useTranslation()
  const [mdPreview, setMdPreview] = useState(false)
  const coverInputRef = useRef(null)
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverProgress, setCoverProgress] = useState(0)
  const [coverError, setCoverError] = useState('')

  const MODULE_OPTIONS = [
    { value: 'training', label: t('course.module_training'), required: true },
    { value: 'theory', label: t('course.module_theory') },
    { value: 'nutrition', label: t('course.module_nutrition') },
    { value: 'recovery', label: t('course.module_recovery') },
    { value: 'sports_nutrition', label: t('course.module_sports_nutrition') },
    { value: 'training_nuances', label: t('course.module_training_nuances') },
  ]

  const LEVEL_OPTIONS = [
    { value: 'beginner', label: t('course.level_beginner') },
    { value: 'intermediate', label: t('course.level_intermediate') },
    { value: 'advanced', label: t('course.level_advanced') },
  ]

  const FORMAT_OPTIONS = [
    { value: 'home', label: t('course.format_home') },
    { value: 'gym', label: t('course.format_gym') },
    { value: 'mixed', label: t('course.format_mixed') },
  ]

  const LANGUAGE_OPTIONS = [
    { value: 'ru', label: t('course.lang_ru') },
    { value: 'uz', label: t('course.lang_uz') },
    { value: 'en', label: t('course.lang_en') },
  ]

  function field(key, value) {
    onChange({ ...data, [key]: value })
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCoverUploading(true)
    setCoverProgress(0)
    setCoverError('')
    try {
      const token = localStorage.getItem('access_token')
      const result = await uploadFileToGDrive({
        file,
        onProgress: p => setCoverProgress(p),
        accessToken: token,
      })
      field('cover_url', result.view_url)
    } catch {
      setCoverError('Ошибка загрузки. Попробуйте ещё раз.')
    } finally {
      setCoverUploading(false)
    }
  }

  function toggleModule(type) {
    if (type === 'training') return
    const selected = data.modules.includes(type)
    if (selected) {
      onChange({ ...data, modules: data.modules.filter((m) => m !== type) })
    } else {
      onChange({ ...data, modules: [...data.modules, type] })
    }
  }

  return (
    <div className="space-y-4">

      {/* Category */}
      <div className="bg-bg-main/5 border border-bg-main/15 rounded-xl p-4">
        <label className={labelCls}>
          {t('create.category')} <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2 mt-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => field('category', cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                data.category === cat.id
                  ? 'bg-bg-main border-bg-main text-white'
                  : 'bg-white border-bg-main/20 text-gray-600 hover:border-bg-main/50'
              }`}
            >
              {cat.title}
            </button>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-gray-400">{t('create.category_placeholder')}</p>
          )}
        </div>
        <FieldError msg={errors?.category} />
      </div>

      {/* Title + Short description */}
      <div className="bg-bg-main/5 border border-bg-main/15 rounded-xl p-4 space-y-4">
        <div>
          <label className={labelCls}>
            {t('create.course_title')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => field('title', e.target.value)}
            placeholder={t('create.course_title_placeholder')}
            className={inputCls}
            maxLength={200}
          />
          <FieldError msg={errors?.title} />
        </div>
        <div>
          <label className={labelCls}>
            {t('create.short_desc')} <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal ml-1">{t('create.short_desc_hint')}</span>
          </label>
          <textarea
            value={data.short_description}
            onChange={(e) => field('short_description', e.target.value)}
            placeholder={t('create.short_desc_placeholder')}
            rows={2}
            maxLength={500}
            className={`${inputCls} resize-none`}
          />
          <div className="flex justify-between mt-0.5">
            <FieldError msg={errors?.short_description} />
            <span className="text-xs text-gray-400">{data.short_description.length}/500</span>
          </div>
        </div>
      </div>

      {/* Cover image */}
      <div className="bg-bg-main/5 border border-bg-main/15 rounded-xl p-4">
        <label className={labelCls}>Обложка курса</label>
        {data.cover_url ? (
          <div className="relative mt-2 rounded-xl overflow-hidden">
            <img
              src={toCoverPreview(data.cover_url)}
              alt="Обложка"
              className="w-full h-44 object-cover rounded-xl"
            />
            <button
              type="button"
              onClick={() => field('cover_url', '')}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : coverUploading ? (
          <div className="mt-2 bg-white border border-bg-main/20 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-gray-600">Загрузка обложки...</span>
              <span className="text-sm font-mono text-bg-main">{coverProgress}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-bg-main transition-all rounded-full" style={{ width: `${coverProgress}%` }} />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="mt-2 flex items-center gap-2 w-full border border-dashed border-bg-main/30 bg-white rounded-xl px-4 py-3 text-sm text-bg-main/70 hover:border-bg-main hover:bg-bg-main/5 hover:text-bg-main transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Загрузить обложку (JPEG или PNG)
          </button>
        )}
        <input ref={coverInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleCoverUpload} />
        {coverError && <p className="mt-1.5 text-xs text-red-500">{coverError}</p>}
        <p className="mt-1.5 text-xs text-gray-400">Рекомендуемый размер: 1280×720 пикселей (16:9)</p>
      </div>

      {/* Modules */}
      <div className="bg-bg-main/5 border border-bg-main/15 rounded-xl p-4">
        <label className={labelCls}>
          {t('create.modules')} <span className="text-gray-400 font-normal">{t('create.modules_hint')}</span>
        </label>
        <div className="flex flex-wrap gap-3 mt-1">
          {MODULE_OPTIONS.map((m) => {
            const checked = data.modules.includes(m.value)
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => toggleModule(m.value)}
                disabled={m.required}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  checked
                    ? 'bg-bg-main border-bg-main text-white'
                    : 'bg-white border-bg-main/20 text-gray-600 hover:border-bg-main/50'
                } ${m.required ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
              >
                {m.label}
                {m.required && <span className="ml-1 text-white/70 text-xs">{t('create.module_required')}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Level + Format + Language */}
      <div className="bg-bg-main/5 border border-bg-main/15 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>{t('create.level')}</label>
            <select value={data.level} onChange={(e) => field('level', e.target.value)} className={selectCls}>
              {LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{t('create.format')}</label>
            <select value={data.format} onChange={(e) => field('format', e.target.value)} className={selectCls}>
              {FORMAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{t('create.course_language')}</label>
            <select value={data.language} onChange={(e) => field('language', e.target.value)} className={selectCls}>
              {LANGUAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Weight range + Price + Duration */}
      <div className="bg-bg-main/5 border border-bg-main/15 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>{t('create.weight_range')}</label>
            <input
              type="text"
              value={data.target_weight_range}
              onChange={(e) => field('target_weight_range', e.target.value)}
              placeholder={t('create.weight_range_placeholder')}
              className={inputCls}
              maxLength={50}
            />
          </div>
          <div>
            <label className={labelCls}>
              {t('create.price_label')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={data.price}
              onChange={(e) => field('price', e.target.value)}
              placeholder="0"
              min="0"
              className={inputCls}
            />
            <FieldError msg={errors?.price} />
          </div>
          <div>
            <label className={labelCls}>{t('create.duration_weeks')}</label>
            <input
              type="number"
              value={data.duration_weeks}
              onChange={(e) => field('duration_weeks', e.target.value)}
              min="1"
              max="52"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Goals text (markdown) */}
      <div className="bg-bg-main/5 border border-bg-main/15 rounded-xl p-4">
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">
            {t('create.goals')}
            <span className="text-gray-400 font-normal ml-1">{t('create.goals_md_hint')}</span>
          </label>
          <button
            type="button"
            onClick={() => setMdPreview((v) => !v)}
            className="text-xs text-bg-main hover:underline"
          >
            {mdPreview ? t('create.goals_edit') : t('create.goals_preview')}
          </button>
        </div>
        {mdPreview ? (
          <div className="min-h-30 bg-white border border-bg-main/20 rounded-lg px-4 py-3 prose prose-sm max-w-none">
            {data.goals_text ? (
              <ReactMarkdown>{data.goals_text}</ReactMarkdown>
            ) : (
              <p className="text-gray-400 italic">{t('create.goals_empty')}</p>
            )}
          </div>
        ) : (
          <textarea
            value={data.goals_text}
            onChange={(e) => field('goals_text', e.target.value)}
            placeholder={t('create.goals_placeholder')}
            rows={5}
            className={`${inputCls} resize-y font-mono text-sm`}
          />
        )}
      </div>

      {/* Equipment / Requirements */}
      <div className="bg-bg-main/5 border border-bg-main/15 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t('create.equipment')}</label>
            <textarea
              value={data.equipment}
              onChange={(e) => field('equipment', e.target.value)}
              placeholder={t('create.equipment_placeholder')}
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>
          <div>
            <label className={labelCls}>{t('create.requirements')}</label>
            <textarea
              value={data.requirements}
              onChange={(e) => field('requirements', e.target.value)}
              placeholder={t('create.requirements_placeholder')}
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      </div>

    </div>
  )
}
