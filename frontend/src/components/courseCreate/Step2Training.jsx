import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import VariantTab from './VariantTab'
import { makeDefaultWeek } from './WeekAccordion'

function makeDefaultVariant(variantNumber) {
  return {
    variant_number: variantNumber,
    active: variantNumber === 1,
    name: '',
    description: '',
    weeks: variantNumber === 1 ? [makeDefaultWeek(1)] : [],
  }
}

export const DEFAULT_VARIANTS = [
  makeDefaultVariant(1),
  makeDefaultVariant(2),
  makeDefaultVariant(3),
]

export default function Step2Training({ variants, onChange }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState(0)

  function updateVariant(idx, updater) {
    onChange(prev => prev.map((v, i) => i === idx ? (typeof updater === 'function' ? updater(v) : updater) : v))
  }

  function toggleVariantActive(idx) {
    if (idx === 0) return
    const v = variants[idx]
    const nowActive = !v.active
    updateVariant(idx, {
      ...v,
      active: nowActive,
      weeks: nowActive && v.weeks.length === 0 ? [makeDefaultWeek(1)] : v.weeks,
    })
  }

  return (
    <div>
      <p className="text-gray-500 text-sm mb-4">
        {t('create.step2_desc')}
      </p>

      {/* Variant tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 pb-0">
        {variants.map((v, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveTab(idx)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative ${
              activeTab === idx
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <span
              className={`mr-1.5 inline-block w-2 h-2 rounded-full ${
                v.active ? 'bg-bg-main' : 'bg-gray-300'
              }`}
            />
            {t('create.variant_tab', { number: idx + 1 })}
            {idx === 0 && (
              <span className="ml-1 text-[10px] text-gray-400">{t('create.variant_required')}</span>
            )}
            {activeTab === idx && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-bg-main rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {variants.map((variant, idx) => {
        if (idx !== activeTab) return null
        return (
          <div key={idx}>
            {idx > 0 && (
              <div className="flex items-center gap-3 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <button
                  type="button"
                  onClick={() => toggleVariantActive(idx)}
                  className={`relative w-10 h-5 rounded-full overflow-hidden transition-all duration-200 shrink-0 cursor-pointer ${
                    variant.active
                      ? 'bg-bg-main ring-1 ring-inset ring-white/20'
                      : 'bg-gray-200 ring-1 ring-inset ring-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full shadow-sm transition-all duration-200 ${
                      variant.active
                        ? 'bg-white left-5.5'
                        : 'bg-gray-400 left-0.5'
                    }`}
                  />
                </button>
                <div>
                  <p className="text-sm text-gray-900 font-medium">
                    {variant.active
                      ? t('create.variant_active', { number: idx + 1 })
                      : t('create.variant_fill', { number: idx + 1 })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {variant.active
                      ? t('create.variant_active_desc')
                      : t('create.variant_inactive_desc')}
                  </p>
                </div>
              </div>
            )}

            {variant.active ? (
              <VariantTab
                variant={variant}
                onChange={(updated) => updateVariant(idx, updated)}
                isFirst={idx === 0}
              />
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
                {t('create.variant_not_activated')}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
