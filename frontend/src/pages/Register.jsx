import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

function Register() {
  const { t } = useTranslation()

  const ROLES = [
    { key: 'student', label: t('register.i_am_student'), icon: '🎓', desc: t('register.student_desc') },
    { key: 'trainer', label: t('register.i_am_trainer'), icon: '💪', desc: t('register.trainer_desc') },
  ]

  const [role, setRole] = useState('student')
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    specialization: '',
    career_start_year: '',
    short_description: '',
    bio: '',
  })
  const [consents, setConsents] = useState({
    terms: false,
    privacy: false,
    trainer_agreement: false,
    marketing: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleConsentChange = (e) => {
    const { name, checked } = e.target
    setConsents((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.phone || !formData.password || !formData.confirmPassword) {
      setError(t('register.fill_required'))
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('register.passwords_dont_match'))
      return
    }

    if (formData.password.length < 6) {
      setError(t('register.password_too_short'))
      return
    }

    setLoading(true)

    try {
      const body = {
        phone: formData.phone,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role,
        marketing_consent: consents.marketing,
      }

      if (role === 'trainer') {
        body.specialization = formData.specialization
        body.career_start_year = formData.career_start_year ? Number(formData.career_start_year) : null
        body.short_description = formData.short_description
        body.bio = formData.bio
        body.trainer_agreement_consent = true
      }

      const response = await fetch(`${API_BASE_URL}/users/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.phone?.[0] || data.detail || t('common.error'))
      }

      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      localStorage.setItem('user', JSON.stringify(data.user))

      window.location.href = '/profile'
    } catch (err) {
      setError(err.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full px-4 py-2.5 rounded-xl bg-bg-header/40 text-text-header placeholder:text-text-primary/40 border border-bg-header/60 focus:outline-none focus:border-link-hover focus:bg-bg-header/60 transition-colors'

  const canSubmit = consents.terms && consents.privacy && (role !== 'trainer' || consents.trainer_agreement)

  return (
    <div className="flex flex-col items-center justify-center px-4 py-10">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-header mb-2">{t('register.title')}</h1>
          <p className="text-text-primary/70">{t('register.subtitle')}</p>
        </div>

        {/* Role Tabs */}
        <div className="flex gap-3 mb-6">
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRole(r.key)}
              className={`flex-1 flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                role === r.key
                  ? 'border-link-hover bg-link-hover/10'
                  : 'border-bg-header/40 bg-bg-header/20 hover:border-bg-header/60'
              }`}
            >
              <span className="text-2xl">{r.icon}</span>
              <span className={`font-medium text-sm ${role === r.key ? 'text-link-hover' : 'text-text-header'}`}>
                {r.label}
              </span>
              <span className="text-xs text-text-primary/50 text-center">{r.desc}</span>
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-header mb-1.5">{t('register.first_name')}</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Иван"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-header mb-1.5">{t('register.last_name')}</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Иванов"
                className={inputClass}
              />
            </div>
          </div>

          {role === 'trainer' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-header mb-1.5">
                  {t('register.specialization')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  placeholder={t('register.specialization_placeholder')}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-header mb-1.5">
                  {t('register.career_start_year')} <span className="text-red-400">*</span>
                </label>
                <select
                  name="career_start_year"
                  value={formData.career_start_year}
                  onChange={handleChange}
                  className={inputClass}
                  required
                >
                  <option value="">{t('register.career_start_year_placeholder')}</option>
                  {Array.from({ length: new Date().getFullYear() - 1959 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-header mb-1.5">
                  {t('register.short_description')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="short_description"
                  value={formData.short_description}
                  onChange={handleChange}
                  placeholder={t('register.short_desc_placeholder')}
                  maxLength={255}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-header mb-1.5">{t('register.about_me')}</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder={t('register.bio_placeholder')}
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-text-header mb-1.5">
              {t('register.phone')} <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+998 90 123 45 67"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-header mb-1.5">
              {t('register.password')} <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={t('register.min_6_chars')}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-header mb-1.5">
              {t('register.confirm_password')} <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder={t('register.repeat_password')}
              className={inputClass}
              required
            />
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-3 pt-2 border-t border-bg-header/30">
            {role === 'trainer' && (
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  name="trainer_agreement"
                  checked={consents.trainer_agreement}
                  onChange={handleConsentChange}
                  className="mt-0.5 w-4 h-4 accent-link-hover shrink-0"
                />
                <span className="text-xs text-text-primary/80 leading-relaxed">
                  <Trans i18nKey="register.trainer_agreement_text">
                    Я ознакомлен(-а) и принимаю условия{' '}
                    <Link to="/trainer-agreement" target="_blank" className="text-link-hover hover:underline">Договора-оферты для тренеров</Link>.
                    Подтверждаю право на публикацию учебных материалов.
                  </Trans>
                  {' '}<span className="text-red-400">*</span>
                </span>
              </label>
            )}

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                name="terms"
                checked={consents.terms}
                onChange={handleConsentChange}
                className="mt-0.5 w-4 h-4 accent-link-hover shrink-0"
              />
              <span className="text-xs text-text-primary/80 leading-relaxed">
                <Trans i18nKey="register.terms_text">
                  Я ознакомлен(-а) и согласен(-на) с{' '}
                  <Link to="/terms" target="_blank" className="text-link-hover hover:underline">Пользовательским соглашением</Link>
                  {' '}и{' '}
                  <Link to="/privacy" target="_blank" className="text-link-hover hover:underline">Политикой конфиденциальности</Link>.
                  Подтверждаю, что мне исполнилось 16 лет.
                </Trans>
                {' '}<span className="text-red-400">*</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                name="privacy"
                checked={consents.privacy}
                onChange={handleConsentChange}
                className="mt-0.5 w-4 h-4 accent-link-hover shrink-0"
              />
              <span className="text-xs text-text-primary/80 leading-relaxed">
                {t('register.privacy_text')} <span className="text-red-400">*</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                name="marketing"
                checked={consents.marketing}
                onChange={handleConsentChange}
                className="mt-0.5 w-4 h-4 accent-link-hover shrink-0"
              />
              <span className="text-xs text-text-primary/60 leading-relaxed">
                {t('register.marketing_text')}{' '}
                <span className="text-text-primary/40">({t('register.optional')})</span>
              </span>
            </label>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full bg-link-hover text-bg-header py-3 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? t('register.registering') : t('register.register_button')}
          </button>
        </form>

        <div className="text-center">
          <span className="text-text-primary/70">{t('register.already_have_account')} </span>
          <Link to="/login" className="text-link-hover hover:underline font-medium">
            {t('auth.login')}
          </Link>
        </div>

        <Link
          to="/"
          className="block text-center text-text-primary/50 hover:text-text-primary/70 text-sm mt-6"
        >
          {t('common.back_to_home')}
        </Link>
      </div>
    </div>
  )
}

export default Register
