import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'

const inputCls =
  'w-full bg-bg-main/30 border border-white/10 rounded-lg px-4 py-2.5 text-text-header placeholder-white/30 outline-none focus:ring-2 focus:ring-link-hover/50'

const selectCls =
  'w-full bg-bg-main/30 border border-white/10 rounded-lg px-4 py-2.5 text-text-header outline-none focus:ring-2 focus:ring-link-hover/50'

const labelCls = 'block text-sm font-medium text-text-primary mb-1'

function FieldError({ msg }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-red-400">{msg}</p>
}

export default function Step1BasicInfo({ data, onChange, errors, categories = [] }) {
  const { t } = useTranslation()
  const [mdPreview, setMdPreview] = useState(false)

  const MODULE_OPTIONS = [
    { value: 'training', label: t('course.module_training'), required: true },
    { value: 'theory', label: t('course.module_theory') },
    { value: 'nutrition', label: t('course.module_nutrition') },
    { value: 'recovery', label: t('course.module_recovery') },
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
    <div className="space-y-6">
      {/* Category */}
      <div>
        <label className={labelCls}>
          {t('create.category')} <span className="text-red-400">*</span>
        </label>
        <select
          value={data.category}
          onChange={(e) => field('category', e.target.value)}
          className={selectCls}
        >
          <option value="" className="bg-bg-header">{t('create.category_placeholder')}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id} className="bg-bg-header">
              {cat.title}
            </option>
          ))}
        </select>
        <FieldError msg={errors?.category} />
      </div>

      {/* Title */}
      <div>
        <label className={labelCls}>
          {t('create.course_title')} <span className="text-red-400">*</span>
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

      {/* Short description */}
      <div>
        <label className={labelCls}>
          {t('create.short_desc')} <span className="text-red-400">*</span>
          <span className="text-white/40 font-normal ml-1">{t('create.short_desc_hint')}</span>
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
          <span className="text-xs text-white/30">{data.short_description.length}/500</span>
        </div>
      </div>

      {/* Modules */}
      <div>
        <label className={labelCls}>
          {t('create.modules')} <span className="text-white/40 font-normal">{t('create.modules_hint')}</span>
        </label>
        <div className="flex flex-wrap gap-3">
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
                    ? 'bg-main border-main text-white'
                    : 'bg-bg-main/20 border-white/20 text-text-primary hover:border-white/40'
                } ${m.required ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
              >
                {m.label}
                {m.required && <span className="ml-1 text-white/50 text-xs">{t('create.module_required')}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Level + Format + Language */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>{t('create.level')}</label>
          <select
            value={data.level}
            onChange={(e) => field('level', e.target.value)}
            className={selectCls}
          >
            {LEVEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-bg-header">
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t('create.format')}</label>
          <select
            value={data.format}
            onChange={(e) => field('format', e.target.value)}
            className={selectCls}
          >
            {FORMAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-bg-header">
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t('create.course_language')}</label>
          <select
            value={data.language}
            onChange={(e) => field('language', e.target.value)}
            className={selectCls}
          >
            {LANGUAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-bg-header">
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Weight range + Price + Duration */}
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
            {t('create.price_label')} <span className="text-red-400">*</span>
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

      {/* Goals text (markdown) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-text-primary">
            {t('create.goals')}
            <span className="text-white/40 font-normal ml-1">{t('create.goals_md_hint')}</span>
          </label>
          <button
            type="button"
            onClick={() => setMdPreview((v) => !v)}
            className="text-xs text-link-hover hover:underline"
          >
            {mdPreview ? t('create.goals_edit') : t('create.goals_preview')}
          </button>
        </div>
        {mdPreview ? (
          <div className="min-h-30 bg-bg-main/20 border border-white/10 rounded-lg px-4 py-3 prose prose-invert prose-sm max-w-none">
            {data.goals_text ? (
              <ReactMarkdown>{data.goals_text}</ReactMarkdown>
            ) : (
              <p className="text-white/30 italic">{t('create.goals_empty')}</p>
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
  )
}
