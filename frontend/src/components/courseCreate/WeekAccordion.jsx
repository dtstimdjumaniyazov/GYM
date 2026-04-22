import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import DayRow from './DayRow'

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]

export function makeDefaultWeek(weekNumber) {
  return {
    week_number: weekNumber,
    days: ALL_DAYS.map((d) => ({
      day_of_week: d,
      is_rest_day: false,
      videos: [],
      files: [],
    })),
  }
}

export default function WeekAccordion({ week, onWeekChange, onDelete, defaultOpen }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(defaultOpen ?? true)

  function updateDay(dayIndex, updatedDay) {
    const newDays = week.days.map((d, i) => (i === dayIndex ? updatedDay : d))
    onWeekChange({ ...week, days: newDays })
  }

  return (
    <div className="border border-white/15 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-bg-main/20 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-white/50 transition-transform ${open ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold text-white">
            {t('create.week_label', { number: week.week_number })}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="text-white/30 hover:text-red-400 transition-colors p-1"
          title={t('create.delete_week')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {open && (
        <div className="px-4 pb-2">
          {/* Column headers */}
          <div className="grid grid-cols-[140px_80px_1fr_1fr] gap-3 py-2 border-b border-white/10">
            <span className="text-xs text-white/40 font-medium">{t('create.col_day')}</span>
            <span className="text-xs text-white/40 font-medium">{t('create.col_rest')}</span>
            <span className="text-xs text-white/40 font-medium">
              {t('create.col_video')} <span className="text-white/25">{t('create.col_max')}</span>
            </span>
            <span className="text-xs text-white/40 font-medium">
              {t('create.col_files')} <span className="text-white/25">{t('create.col_max')}</span>
            </span>
          </div>

          {week.days.map((day, idx) => (
            <DayRow
              key={day.day_of_week}
              day={day}
              onChange={(updated) => updateDay(idx, updated)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
