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

  function updateVariant(idx, updated) {
    onChange(variants.map((v, i) => (i === idx ? updated : v)))
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
      <p className="text-white/50 text-sm mb-4">
        {t('create.step2_desc')}
      </p>

      {/* Variant tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/10 pb-0">
        {variants.map((v, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveTab(idx)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative ${
              activeTab === idx
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <span
              className={`mr-1.5 inline-block w-2 h-2 rounded-full ${
                v.active ? 'bg-main' : 'bg-white/20'
              }`}
            />
            {t('create.variant_tab', { number: idx + 1 })}
            {idx === 0 && (
              <span className="ml-1 text-[10px] text-white/40">{t('create.variant_required')}</span>
            )}
            {activeTab === idx && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-main rounded-t" />
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
              <div className="flex items-center gap-3 mb-5 p-4 bg-bg-main/20 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => toggleVariantActive(idx)}
                  className={`relative w-10 h-5 rounded-full overflow-hidden transition-all duration-200 shrink-0 cursor-pointer ${
                    variant.active
                      ? 'bg-main ring-1 ring-inset ring-white/20'
                      : 'bg-white/10 ring-1 ring-inset ring-white/30'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full shadow-sm transition-all duration-200 ${
                      variant.active
                        ? 'bg-white left-5.5'
                        : 'bg-white/90 left-0.5'
                    }`}
                  />
                </button>
                <div>
                  <p className="text-sm text-white font-medium">
                    {variant.active
                      ? t('create.variant_active', { number: idx + 1 })
                      : t('create.variant_fill', { number: idx + 1 })}
                  </p>
                  <p className="text-xs text-white/40">
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
              <div className="flex items-center justify-center h-32 text-white/30 text-sm border border-dashed border-white/15 rounded-xl">
                {t('create.variant_not_activated')}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
