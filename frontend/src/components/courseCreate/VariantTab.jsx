import { useTranslation } from 'react-i18next'
import WeekAccordion, { makeDefaultWeek } from './WeekAccordion'

const inputCls =
  'w-full bg-bg-main/30 border border-white/10 rounded-lg px-4 py-2.5 text-text-header placeholder-white/30 outline-none focus:ring-2 focus:ring-link-hover/50'

export default function VariantTab({ variant, onChange, isFirst }) {
  const { t } = useTranslation()

  function field(key, value) {
    onChange({ ...variant, [key]: value })
  }

  function addWeek() {
    const nextNum = variant.weeks.length > 0
      ? Math.max(...variant.weeks.map((w) => w.week_number)) + 1
      : 1
    onChange({ ...variant, weeks: [...variant.weeks, makeDefaultWeek(nextNum)] })
  }

  function updateWeek(idx, updated) {
    const weeks = variant.weeks.map((w, i) => (i === idx ? updated : w))
    onChange({ ...variant, weeks })
  }

  function deleteWeek(idx) {
    if (variant.weeks.length <= 1 && isFirst) return
    const weeks = variant.weeks.filter((_, i) => i !== idx)
    onChange({ ...variant, weeks })
  }

  return (
    <div className="space-y-5">
      {/* Variant name + description */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t('create.variant_name')}
            {isFirst && <span className="text-red-400 ml-1">*</span>}
          </label>
          <input
            type="text"
            value={variant.name}
            onChange={(e) => field('name', e.target.value)}
            placeholder={t('create.variant_name_placeholder')}
            maxLength={100}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">{t('create.variant_description')}</label>
          <input
            type="text"
            value={variant.description}
            onChange={(e) => field('description', e.target.value)}
            placeholder={t('create.variant_desc_placeholder')}
            maxLength={255}
            className={inputCls}
          />
        </div>
      </div>

      {/* Weeks */}
      <div className="space-y-3">
        {variant.weeks.map((week, idx) => (
          <WeekAccordion
            key={week.week_number}
            week={week}
            onWeekChange={(updated) => updateWeek(idx, updated)}
            onDelete={() => deleteWeek(idx)}
            defaultOpen={idx === variant.weeks.length - 1}
          />
        ))}

        <button
          type="button"
          onClick={addWeek}
          className="flex items-center gap-2 text-sm text-link-hover hover:text-white transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('create.add_week')}
        </button>
      </div>
    </div>
  )
}
