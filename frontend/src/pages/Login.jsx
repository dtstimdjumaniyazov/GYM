import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useTranslation } from 'react-i18next'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const BOT_ID = import.meta.env.VITE_TELEGRAM_BOT_ID || ''

function Login() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [phoneForm, setPhoneForm] = useState({ phone: '', password: '' })

  const saveAndRedirect = useCallback(
    (data) => {
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      localStorage.setItem('user', JSON.stringify(data.user))
      window.location.href = '/'
    },
    [],
  )

  const handlePhoneLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!phoneForm.phone || !phoneForm.password) {
      setError(t('auth.fill_phone_and_password'))
      return
    }

    setLoading(true)

    try {
      const tokenResponse = await fetch(`${API_BASE_URL}/users/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneForm.phone, password: phoneForm.password }),
      })

      if (!tokenResponse.ok) {
        throw new Error(t('auth.wrong_credentials'))
      }

      const tokens = await tokenResponse.json()

      const profileResponse = await fetch(`${API_BASE_URL}/users/profile/`, {
        headers: { Authorization: `Bearer ${tokens.access}` },
      })

      const user = profileResponse.ok ? await profileResponse.json() : {}

      saveAndRedirect({ ...tokens, user })
    } catch (err) {
      setError(err.message || t('auth.login_error'))
      setLoading(false)
    }
  }

  const authenticateWithTelegram = useCallback(
    async (telegramUser) => {
      setError('')
      setLoading(true)

      try {
        const response = await fetch(`${API_BASE_URL}/users/auth/telegram/callback/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(telegramUser),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.detail || t('auth.telegram_auth_error'))
        }

        if (data.status === 'pending_link') {
          navigate('/social-link', {
            state: {
              socialToken: data.social_token,
              provider: data.provider,
              socialName: data.social_name,
            },
          })
          return
        }

        saveAndRedirect(data)
      } catch (err) {
        setError(err.message || t('auth.auth_error'))
        setLoading(false)
      }
    },
    [saveAndRedirect, t],
  )

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return

    const match = hash.match(/tgAuthResult=([A-Za-z0-9_-]+)/)
    if (!match) return

    try {
      let base64 = match[1].replace(/-/g, '+').replace(/_/g, '/')
      while (base64.length % 4) base64 += '='

      const decoded = JSON.parse(atob(base64))
      window.history.replaceState(null, '', window.location.pathname)
      authenticateWithTelegram(decoded)
    } catch {
      setError(t('auth.telegram_data_error'))
    }
  }, [authenticateWithTelegram, t])

  const handleTelegramLogin = () => {
    const origin = window.location.origin
    const returnTo = `${origin}/login`
    const authUrl = `https://oauth.telegram.org/auth?bot_id=${BOT_ID}&origin=${encodeURIComponent(origin)}&embed=0&request_access=write&return_to=${encodeURIComponent(returnTo)}`
    window.location.href = authUrl
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/users/auth/google/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || t('auth.google_auth_error'))
      }

      if (data.status === 'pending_link') {
        navigate('/social-link', {
          state: {
            socialToken: data.social_token,
            provider: data.provider,
            socialName: data.social_name,
            socialEmail: data.social_email,
          },
        })
        return
      }

      saveAndRedirect(data)
    } catch (err) {
      setError(err.message || t('auth.google_auth_error'))
      setLoading(false)
    }
  }

  const handleGoogleError = () => {
    setError(t('auth.google_login_error'))
  }

  const inputClass =
    'w-full px-4 py-2.5 rounded-xl bg-bg-header/40 text-text-header placeholder:text-text-primary/40 border border-bg-header/60 focus:outline-none focus:border-link-hover focus:bg-bg-header/60 transition-colors'

  return (
    <div className="flex flex-col items-center justify-center px-4 py-10">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-header mb-2">{t('auth.login_title')}</h1>
          <p className="text-text-primary/70">{t('auth.login_subtitle')}</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Phone + Password */}
        <div className="bg-bg-header/40 rounded-2xl p-6 mb-4">
          <h3 className="font-bold text-text-header mb-4">{t('auth.phone_login')}</h3>
          <form onSubmit={handlePhoneLogin} className="flex flex-col gap-3">
            <input
              type="tel"
              value={phoneForm.phone}
              onChange={(e) => setPhoneForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+998 90 123 45 67"
              className={inputClass}
              required
            />
            <div className="flex flex-col gap-1">
              <input
                type="password"
                value={phoneForm.password}
                onChange={(e) => setPhoneForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder={t('auth.password')}
                className={inputClass}
                required
              />
              <span className="text-text-primary/50 text-xs text-right">
                {t('auth.forgot_password')}
              </span>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-link-hover text-bg-header py-3 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {loading ? t('auth.logging_in') : t('auth.login')}
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-text-header/10" />
          <span className="text-sm text-text-primary/50">{t('common.or')}</span>
          <div className="flex-1 h-px bg-text-header/10" />
        </div>

        {/* Social Login Buttons */}
        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={handleTelegramLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-[#2AABEE] hover:bg-[#229ED9] text-white py-3 px-6 rounded-xl font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            {t('auth.login_with_telegram')}
          </button>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signin_with"
              shape="rectangular"
              size="large"
              width="400"
              locale={i18n.language}
            />
          </div>
        </div>

        <div className="text-center">
          <span className="text-text-primary/70">{t('auth.no_account')} </span>
          <Link to="/register" className="text-link-hover hover:underline font-medium">
            {t('auth.register')}
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

export default Login
