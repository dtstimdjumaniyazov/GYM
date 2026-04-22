import { useTranslation } from 'react-i18next'

export default function StepIndicator({ currentStep, totalSteps }) {
  const { t } = useTranslation()

  const STEPS = [
    { number: 1, label: t('create.step_description') },
    { number: 2, label: t('create.step_training') },
    { number: 3, label: t('create.step_materials') },
  ]

  const steps = STEPS.slice(0, totalSteps)
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((step, idx) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                currentStep > step.number
                  ? 'bg-green-500 text-white'
                  : currentStep === step.number
                  ? 'bg-main text-white'
                  : 'bg-white/10 text-white/50'
              }`}
            >
              {currentStep > step.number ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.number
              )}
            </div>
            <span
              className={`mt-1 text-xs whitespace-nowrap ${
                currentStep === step.number ? 'text-white font-medium' : 'text-white/50'
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`h-0.5 w-16 mx-1 mb-4 transition-colors ${
                currentStep > step.number ? 'bg-green-500' : 'bg-white/15'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
