import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useTranslation } from 'react-i18next'
import {
  useGetUserProfileQuery,
  useUpdateUserProfileMutation,
  useUpdateTrainerProfileMutation,
  useDisconnectTelegramMutation,
  useDisconnectGoogleMutation,
  useLinkTelegramProfileMutation,
  useLinkGoogleProfileMutation,
  useUploadAvatarMutation,
  useDeleteAvatarMutation,
  useGetTrainerDashboardQuery,
  useGetTrainerCoursesQuery,
  useToggleCourseStatusMutation,
  useRequestCourseDeletionMutation,
  useChangePasswordMutation,
} from '../app/api/usersApi'
import { useGetUserEnrollmentsQuery } from '../app/api/enrollmentsApi'
import { useGetUserFavoritesQuery } from '../app/api/coursesApi'
import { useRequestVerificationMutation } from '../app/api/notificationsApi'
import Pagination from '../components/Pagination'
import Loader from '../components/Loader'
import { MoreVertical, Eye, Edit3, Trash2, ToggleLeft, ToggleRight, AlertTriangle, CheckCircle, X, Camera, Lock } from 'lucide-react'

const BOT_ID = import.meta.env.VITE_TELEGRAM_BOT_ID || ''

const STUDENT_TABS = ['profile', 'courses', 'history', 'favorites']
const TRAINER_TABS = ['profile', 'overview', 'trainer-courses']

function toDirectUrl(url) {
  if (!url) return null
  const match = url.match(/\/file\/d\/([^/]+)/)
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`
  return url
}

// ─── Edit Profile Modal ───────────────────────────────────────────
function EditProfileModal({ profile, trainerProfile, onClose }) {
  const { t } = useTranslation()
  const [updateProfile, { isLoading: savingUser }] = useUpdateUserProfileMutation()
  const [updateTrainer, { isLoading: savingTrainer }] = useUpdateTrainerProfileMutation()
  const isTrainer = profile.role === 'trainer'
  const [form, setForm] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    age: profile.age || '',
    gender: profile.gender || '',
    weight: profile.weight || '',
    career_start_year: trainerProfile?.career_start_year || '',
  })
  const [error, setError] = useState(null)
  const isLoading = savingUser || savingTrainer

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const updated = await updateProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || '',
        weight: form.weight ? Number(form.weight) : null,
      }).unwrap()
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({
        ...stored,
        first_name: updated.first_name,
        last_name: updated.last_name,
        full_name: updated.full_name,
        is_profile_complete: updated.is_profile_complete,
      }))
      if (isTrainer) {
        await updateTrainer({
          career_start_year: form.career_start_year ? Number(form.career_start_year) : null,
        }).unwrap()
      }
      onClose()
    } catch (err) {
      setError(err?.data?.detail || t('profile.save_error'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-bg-header rounded-2xl p-6 w-full max-w-md mx-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-text-header mb-4">{t('profile.edit_profile')}</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-text-primary">{t('profile.first_name')}</span>
            <input
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              className="bg-bg-main/30 text-text-header rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-link-hover/50"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-text-primary">{t('profile.last_name')}</span>
            <input
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              className="bg-bg-main/30 text-text-header rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-link-hover/50"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-text-primary">{t('profile.age')}</span>
            <input
              name="age"
              type="number"
              min="1"
              max="120"
              value={form.age}
              onChange={handleChange}
              className="bg-bg-main/30 text-text-header rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-link-hover/50"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-text-primary">{t('profile.gender')}</span>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="bg-bg-main/30 text-text-header rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-link-hover/50"
            >
              <option value="">{t('profile.gender_not_specified')}</option>
              <option value="male">{t('profile.gender_male')}</option>
              <option value="female">{t('profile.gender_female')}</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-text-primary">{t('profile.weight_kg')}</span>
            <input
              name="weight"
              type="number"
              min="20"
              max="300"
              step="0.1"
              value={form.weight}
              onChange={handleChange}
              className="bg-bg-main/30 text-text-header rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-link-hover/50"
            />
          </label>

          {isTrainer && (
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text-primary">{t('register.career_start_year')}</span>
              <select
                name="career_start_year"
                value={form.career_start_year}
                onChange={handleChange}
                className="bg-bg-main/30 text-text-header rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-link-hover/50"
              >
                <option value="">{t('register.career_start_year_placeholder')}</option>
                {Array.from({ length: new Date().getFullYear() - 1959 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 mt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-link-hover text-bg-header font-medium py-2 rounded-lg hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              {isLoading ? t('common.saving') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-bg-main/30 text-text-header font-medium py-2 rounded-lg hover:bg-bg-main/50 transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Edit Trainer Links Modal ─────────────────────────────────────
function EditTrainerLinksModal({ trainerProfile, onClose }) {
  const { t } = useTranslation()
  const [updateTrainer, { isLoading }] = useUpdateTrainerProfileMutation()
  const [form, setForm] = useState({
    career_start_year: trainerProfile?.career_start_year || '',
    instagram_url: trainerProfile?.instagram_url || '',
    intro_video_url: trainerProfile?.intro_video_url || '',
  })
  const [error, setError] = useState(null)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await updateTrainer({
        career_start_year: form.career_start_year ? Number(form.career_start_year) : null,
        instagram_url: form.instagram_url.trim(),
        intro_video_url: form.intro_video_url.trim(),
      }).unwrap()
      onClose()
    } catch (err) {
      setError(err?.data?.detail || t('profile.save_error'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-bg-header rounded-2xl p-6 w-full max-w-md mx-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-text-header mb-4">{t('profile.social_and_video')}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-text-primary">{t('register.career_start_year')}</span>
            <select
              name="career_start_year"
              value={form.career_start_year}
              onChange={handleChange}
              className="bg-bg-main/30 text-text-header rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-link-hover/50"
            >
              <option value="">{t('register.career_start_year_placeholder')}</option>
              {Array.from({ length: new Date().getFullYear() - 1959 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-text-primary">{t('profile.instagram_link')}</span>
            <input
              name="instagram_url"
              type="url"
              value={form.instagram_url}
              onChange={handleChange}
              placeholder="https://instagram.com/username"
              className="bg-bg-main/30 text-text-header rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-link-hover/50"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-text-primary">{t('profile.intro_video')}</span>
            <input
              name="intro_video_url"
              type="url"
              value={form.intro_video_url}
              onChange={handleChange}
              placeholder="https://youtu.be/video_id"
              className="bg-bg-main/30 text-text-header rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-link-hover/50"
            />
          </label>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 mt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-link-hover text-bg-header font-medium py-2 rounded-lg hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              {isLoading ? t('common.saving') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-bg-main/30 text-text-header font-medium py-2 rounded-lg hover:bg-bg-main/50 transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Edit Certificates Modal ─────────────────────────────────────
function EditCertificatesModal({ certificates, onClose }) {
  const { t } = useTranslation()
  const [updateTrainer, { isLoading }] = useUpdateTrainerProfileMutation()
  const [certs, setCerts] = useState(certificates || [])
  const [newCert, setNewCert] = useState('')
  const [error, setError] = useState(null)

  const addCert = () => {
    const trimmed = newCert.trim()
    if (trimmed && !certs.includes(trimmed)) {
      setCerts([...certs, trimmed])
      setNewCert('')
    }
  }

  const removeCert = (idx) => {
    setCerts(certs.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await updateTrainer({ certificates: certs }).unwrap()
      onClose()
    } catch (err) {
      setError(err?.data?.detail || t('profile.save_error'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-bg-header rounded-2xl p-6 w-full max-w-md mx-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-text-header mb-4">{t('profile.certificates')}</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {certs.map((cert, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-bg-main/30 rounded-lg px-3 py-2">
                <span className="text-text-header text-sm flex-1">{cert}</span>
                <button
                  type="button"
                  onClick={() => removeCert(idx)}
                  className="text-red-400 hover:text-red-300 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={newCert}
              onChange={(e) => setNewCert(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCert() } }}
              placeholder={t('profile.cert_name_placeholder')}
              className="flex-1 bg-bg-main/30 text-text-header rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-link-hover/50"
            />
            <button
              type="button"
              onClick={addCert}
              className="bg-link-hover/20 text-link-hover px-3 py-2 rounded-lg hover:bg-link-hover/30 transition-colors cursor-pointer"
            >
              +
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 mt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-link-hover text-bg-header font-medium py-2 rounded-lg hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              {isLoading ? t('common.saving') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-bg-main/30 text-text-header font-medium py-2 rounded-lg hover:bg-bg-main/50 transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Change Password Modal ────────────────────────────────────────
function ChangePasswordModal({ onClose }) {
  const { t } = useTranslation()
  const [changePassword, { isLoading }] = useChangePasswordMutation()
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (form.new_password !== form.confirm_password) {
      setError(t('profile.passwords_dont_match'))
      return
    }
    try {
      const payload = { new_password: form.new_password }
      if (form.current_password) payload.current_password = form.current_password
      const result = await changePassword(payload).unwrap()
      localStorage.setItem('access_token', result.access)
      localStorage.setItem('refresh_token', result.refresh)
      setSuccess(true)
    } catch (err) {
      setError(err?.data?.detail || t('profile.change_password_error'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-bg-header rounded-2xl p-6 w-full max-w-md mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-header">{t('profile.change_password_title')}</h2>
          <button onClick={onClose} className="text-text-primary hover:text-text-header cursor-pointer"><X size={20} /></button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
            <p className="text-text-header font-medium">{t('profile.password_changed')}</p>
            <button onClick={onClose} className="mt-4 bg-link-hover text-bg-header font-medium px-6 py-2 rounded-lg hover:opacity-90 cursor-pointer">
              {t('common.close')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text-primary">
                {t('profile.current_password')}{' '}
                <span className="text-text-primary/50">{t('profile.current_password_hint')}</span>
              </span>
              <input
                type="password"
                value={form.current_password}
                onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                className="bg-bg-main/30 text-text-header rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-link-hover/50"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text-primary">{t('profile.new_password')}</span>
              <input
                type="password"
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                minLength={6}
                required
                className="bg-bg-main/30 text-text-header rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-link-hover/50"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text-primary">{t('profile.confirm_password')}</span>
              <input
                type="password"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                required
                className="bg-bg-main/30 text-text-header rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-link-hover/50"
              />
            </label>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3 mt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-link-hover text-bg-header font-medium py-2 rounded-lg hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {isLoading ? t('common.saving') : t('profile.change_password_title')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-bg-main/30 text-text-header font-medium py-2 rounded-lg hover:bg-bg-main/50 transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Social Accounts Section ─────────────────────────────────────
function SocialAccountsSection({ profile }) {
  const { t } = useTranslation()
  const [disconnectTelegram, { isLoading: tgDisconnecting }] = useDisconnectTelegramMutation()
  const [disconnectGoogle, { isLoading: gDisconnecting }] = useDisconnectGoogleMutation()
  const [linkTelegram, { isLoading: tgLinking }] = useLinkTelegramProfileMutation()
  const [linkGoogle] = useLinkGoogleProfileMutation()
  const [error, setError] = useState(null)
  const [showChangePassword, setShowChangePassword] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return

    const match = hash.match(/tgAuthResult=([A-Za-z0-9_-]+)/)
    if (!match) return

    try {
      let base64 = match[1].replace(/-/g, '+').replace(/_/g, '/')
      while (base64.length % 4) base64 += '='
      const decoded = JSON.parse(atob(base64))
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      handleTelegramLink(decoded)
    } catch {
      setError(t('profile.telegram_data_error'))
    }
  }, [])

  const handleTelegramLink = async (telegramData) => {
    setError(null)
    try {
      await linkTelegram(telegramData).unwrap()
    } catch (err) {
      setError(err?.data?.detail || t('profile.telegram_link_error'))
    }
  }

  const handleTelegramClick = () => {
    const origin = window.location.origin
    const returnTo = `${origin}/profile?tab=profile`
    const authUrl = `https://oauth.telegram.org/auth?bot_id=${BOT_ID}&origin=${encodeURIComponent(origin)}&embed=0&request_access=write&return_to=${encodeURIComponent(returnTo)}`
    window.location.href = authUrl
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(null)
    try {
      await linkGoogle(credentialResponse.credential).unwrap()
    } catch (err) {
      setError(err?.data?.detail || t('profile.google_link_error'))
    }
  }

  return (
    <div className="bg-bg-header/60 rounded-2xl p-6 mt-4">
      <h3 className="text-lg font-bold text-text-header mb-4">{t('profile.linked_accounts')}</h3>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {/* Telegram */}
        <div className="flex items-center justify-between border-b border-text-header/10 pb-3">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-[#29B6F6]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            <div>
              <span className="text-text-primary text-sm">Telegram</span>
              {profile.telegram_id ? (
                <p className="text-text-header text-xs">ID: {profile.telegram_id}</p>
              ) : (
                <p className="text-text-primary/50 text-xs">{t('profile.not_linked')}</p>
              )}
            </div>
          </div>
          {profile.telegram_id ? (
            <button
              onClick={() => disconnectTelegram()}
              disabled={tgDisconnecting}
              className="text-red-400 text-sm hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              {tgDisconnecting ? '...' : t('profile.unlink')}
            </button>
          ) : (
            <button
              onClick={handleTelegramClick}
              disabled={tgLinking}
              className="text-[#29B6F6] text-sm hover:text-[#29B6F6]/80 transition-colors cursor-pointer disabled:opacity-50"
            >
              {tgLinking ? '...' : t('profile.link')}
            </button>
          )}
        </div>

        {/* Google */}
        <div className="flex items-center justify-between border-b border-text-header/10 pb-3">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <div>
              <span className="text-text-primary text-sm">Google</span>
              {profile.google_id ? (
                <p className="text-text-header text-xs">{profile.email || `ID: ${profile.google_id}`}</p>
              ) : (
                <p className="text-text-primary/50 text-xs">{t('profile.not_linked')}</p>
              )}
            </div>
          </div>
          {profile.google_id ? (
            <button
              onClick={() => disconnectGoogle()}
              disabled={gDisconnecting}
              className="text-red-400 text-sm hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              {gDisconnecting ? '...' : t('profile.unlink')}
            </button>
          ) : (
            <div className="scale-75 origin-right">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError(t('profile.google_link_error'))}
                text="signin"
                shape="pill"
                size="small"
                locale="ru"
              />
            </div>
          )}
        </div>

        {/* Password */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-text-primary shrink-0" />
            <span className="text-text-primary text-sm">{t('profile.password_label')}</span>
          </div>
          <button
            onClick={() => setShowChangePassword(true)}
            className="text-link-hover text-sm hover:opacity-80 transition-opacity cursor-pointer"
          >
            {t('profile.change_password')}
          </button>
        </div>
      </div>

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  )
}

// ─── Video embed helper ───────────────────────────────────────────
function getEmbedUrl(url) {
  if (!url) return null
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?badge=0&autopause=0&player_id=0`
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  return null
}

// ─── Profile Tab ──────────────────────────────────────────────────
function ProfileTab({ profile, onEdit, onEditCerts, onEditTrainerLinks }) {
  const { t } = useTranslation()
  const isTrainer = profile.role === 'trainer'
  const trainerProfile = profile.trainer_profile
  const [requestVerification, { isLoading: requestingVerif, isSuccess: verifRequested }] = useRequestVerificationMutation()

  const GENDER_LABELS = {
    male: t('profile.gender_male'),
    female: t('profile.gender_female'),
  }

  const fields = [
    { label: t('profile.first_name'), value: profile.first_name || '—' },
    { label: t('profile.last_name'), value: profile.last_name || '—' },
    { label: t('profile.phone'), value: profile.phone || '—' },
    { label: t('profile.age'), value: profile.age ? t('profile.age_years', { age: profile.age }) : '—' },
    { label: t('profile.gender'), value: GENDER_LABELS[profile.gender] || '—' },
    { label: t('profile.weight_kg'), value: profile.weight ? t('profile.weight_value', { weight: profile.weight }) : '—' },
  ]

  return (
    <>
      <div className="bg-bg-header/60 rounded-2xl p-6">
        <div className="grid gap-4">
          {fields.map((f) => (
            <div key={f.label} className="flex items-center justify-between border-b border-text-header/10 pb-3">
              <span className="text-text-primary text-sm">{f.label}</span>
              <span className="text-text-header font-medium">{f.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={onEdit}
            className="bg-link-hover text-bg-header font-medium px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
          >
            {t('profile.edit_profile')}
          </button>
          {isTrainer && trainerProfile && !trainerProfile.is_verified && (
            <button
              onClick={() => requestVerification()}
              disabled={requestingVerif || verifRequested}
              className="bg-bg-header border border-link-hover/40 text-link-hover font-medium px-6 py-2.5 rounded-xl hover:bg-link-hover/10 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {verifRequested ? '✅ Запрос отправлен' : requestingVerif ? 'Отправка...' : '🆔 Запросить верификацию'}
            </button>
          )}
        </div>
      </div>

      {isTrainer && trainerProfile && (
        <div className="bg-bg-header/60 rounded-2xl p-6 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text-header">{t('profile.certificates')}</h3>
            <button
              onClick={onEditCerts}
              className="text-link-hover text-sm hover:opacity-80 transition-opacity cursor-pointer"
            >
              {t('common.edit')}
            </button>
          </div>
          {trainerProfile.certificates && trainerProfile.certificates.length > 0 ? (
            <div className="flex flex-col gap-2">
              {trainerProfile.certificates.map((cert, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <CheckCircle size={14} className="text-green-400 shrink-0" />
                  <span className="text-text-header">{cert}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-primary/50 text-sm">{t('profile.no_certificates')}</p>
          )}
        </div>
      )}

      {isTrainer && trainerProfile && (
        <div className="bg-bg-header/60 rounded-2xl p-6 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text-header">{t('profile.social_and_video')}</h3>
            <button
              onClick={onEditTrainerLinks}
              className="text-link-hover text-sm hover:opacity-80 transition-opacity cursor-pointer"
            >
              {t('common.edit')}
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <svg className="w-5 h-5 shrink-0 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
            </svg>
            {trainerProfile.instagram_url ? (
              <a
                href={trainerProfile.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link-hover text-sm hover:underline truncate"
              >
                {trainerProfile.instagram_url.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, '')}
              </a>
            ) : (
              <span className="text-text-primary/50 text-sm">{t('profile.no_instagram')}</span>
            )}
          </div>

          {trainerProfile.intro_video_url ? (
            getEmbedUrl(trainerProfile.intro_video_url) ? (
              <div className="rounded-xl overflow-hidden aspect-video">
                <iframe
                  src={getEmbedUrl(trainerProfile.intro_video_url)}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title={t('profile.trainer_video_title')}
                />
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden bg-black">
                <video controls className="w-full max-h-120" src={trainerProfile.intro_video_url}>
                  {t('profile.video_not_supported')}
                </video>
              </div>
            )
          ) : (
            <p className="text-text-primary/50 text-sm">{t('profile.no_intro_video')}</p>
          )}
        </div>
      )}

      <SocialAccountsSection profile={profile} />
    </>
  )
}

// ─── My Courses Tab (Student) ────────────────────────────────────
function MyCoursesTab() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useGetUserEnrollmentsQuery({ page })

  const enrollments = data?.results || []
  const totalPages = data ? Math.ceil(data.count / 15) : 1

  if (isLoading) return <Loader text={t('profile.loading_courses')} />

  if (!data || enrollments.length === 0) {
    return (
      <div className="bg-bg-header/60 rounded-2xl p-8 text-center">
        <p className="text-text-primary text-lg mb-4">{t('profile.no_purchased_courses')}</p>
        <Link
          to="/"
          className="inline-block bg-link-hover text-bg-header font-medium px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
        >
          {t('profile.go_to_catalog')}
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4">
        {enrollments.map((enr) => {
          const coverSrc = toDirectUrl(enr.course_cover_url)
          const percent = enr.progress_percent || 0

          return (
            <div
              key={enr.id}
              className="bg-bg-header/60 rounded-2xl overflow-hidden flex flex-col sm:flex-row"
            >
              {coverSrc && (
                <div className="sm:w-48 aspect-video sm:aspect-auto bg-bg-header shrink-0">
                  <img src={coverSrc} alt={enr.course_title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5 flex flex-col gap-3 flex-1">
                <h3 className="font-bold text-lg text-text-header">{enr.course_title}</h3>
                <p className="text-link-hover text-sm">{enr.trainer_name}</p>

                <div>
                  <div className="flex justify-between text-sm text-text-primary mb-1">
                    <span>{t('profile.lessons_progress', { completed: enr.completed_lessons, total: enr.total_lessons })}</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-bg-main/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-link-hover rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/courses/${enr.course_id}/lessons`)}
                  className="self-start mt-auto bg-link-hover text-bg-header font-medium px-5 py-2 rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {t('common.continue')}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  )
}

// ─── Purchase History Tab ─────────────────────────────────────────
function PurchaseHistoryTab() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useGetUserEnrollmentsQuery({ page })

  const enrollments = data?.results || []
  const totalPages = data ? Math.ceil(data.count / 15) : 1

  if (isLoading) return <Loader text={t('profile.loading_history')} />

  if (!data || enrollments.length === 0) {
    return (
      <div className="bg-bg-header/60 rounded-2xl p-8 text-center">
        <p className="text-text-primary text-lg">{t('profile.no_purchases')}</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:hidden">
        {enrollments.map((enr) => (
          <div key={enr.id} className="bg-bg-header/60 rounded-2xl p-4 flex flex-col gap-2">
            <p className="text-text-header font-medium">{enr.course_title}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-primary">
                {new Date(enr.created_at).toLocaleDateString('ru-RU')}
              </span>
              <span className="text-text-header font-medium">
                {enr.amount_paid
                  ? `${Number(enr.amount_paid).toLocaleString('ru-RU')} UZS`
                  : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden sm:block bg-bg-header/60 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-text-header/10">
              <th className="px-5 py-3 text-sm text-text-primary font-medium">{t('profile.table_course')}</th>
              <th className="px-5 py-3 text-sm text-text-primary font-medium">{t('profile.table_date')}</th>
              <th className="px-5 py-3 text-sm text-text-primary font-medium text-right">{t('profile.table_amount')}</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((enr) => (
              <tr key={enr.id} className="border-b border-text-header/5 last:border-0">
                <td className="px-5 py-3 text-text-header">{enr.course_title}</td>
                <td className="px-5 py-3 text-text-primary text-sm">
                  {new Date(enr.created_at).toLocaleDateString('ru-RU')}
                </td>
                <td className="px-5 py-3 text-text-header text-right">
                  {enr.amount_paid
                    ? `${Number(enr.amount_paid).toLocaleString('ru-RU')} UZS`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  )
}

// ─── Favorites Tab ────────────────────────────────────────────────
function FavoritesTab() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useGetUserFavoritesQuery({ page })

  const favorites = data?.results || []
  const totalPages = data ? Math.ceil(data.count / 15) : 1

  if (isLoading) return <Loader text={t('profile.loading_favorites')} />

  if (!data || favorites.length === 0) {
    return (
      <div className="bg-bg-header/60 rounded-2xl p-8 text-center">
        <p className="text-text-primary text-lg mb-4">{t('profile.no_favorites')}</p>
        <Link
          to="/"
          className="inline-block bg-link-hover text-bg-header font-medium px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
        >
          {t('profile.go_to_catalog')}
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {favorites.map((course) => {
          const coverSrc = toDirectUrl(course.cover_url)
          return (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="bg-bg-header/80 rounded-2xl overflow-hidden flex flex-col hover:ring-2 hover:ring-link-hover/40 transition-all"
            >
              {coverSrc && (
                <div className="aspect-video bg-bg-header">
                  <img src={coverSrc} alt={course.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4 flex flex-col gap-2">
                <h3 className="font-bold text-text-header">{course.title}</h3>
                <p className="text-link-hover text-sm">{course.trainer_name}</p>
                <p className="text-text-header font-bold mt-auto">
                  {Number(course.price).toLocaleString('ru-RU')} UZS
                </p>
              </div>
            </Link>
          )
        })}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  )
}

// ─── Trainer Overview Tab ─────────────────────────────────────────
function TrainerOverviewTab() {
  const { t } = useTranslation()
  const { data, isLoading } = useGetTrainerDashboardQuery()

  if (isLoading) return <Loader text={t('profile.loading_stats')} />

  if (!data) {
    return (
      <div className="bg-bg-header/60 rounded-2xl p-8 text-center">
        <p className="text-text-primary">{t('profile.stats_load_error')}</p>
      </div>
    )
  }

  const stats = [
    { label: t('profile.stats_courses'), value: data.total_courses, color: 'text-link-hover' },
    { label: t('profile.stats_students'), value: data.total_students, color: 'text-green-400' },
    { label: `${Number(data.total_revenue).toLocaleString('ru-RU')} UZS`, value: t('profile.stats_revenue'), color: 'text-yellow-400' },
    { label: t('profile.stats_active'), value: data.active_students, color: 'text-blue-400' },
  ]

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-bg-header/60 rounded-2xl p-6 flex flex-col items-center gap-2">
          <span className="text-text-primary text-sm">{s.label}</span>
          <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Trainer Courses Tab ──────────────────────────────────────────
function TrainerCoursesTab() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: courses, isLoading } = useGetTrainerCoursesQuery(undefined, { refetchOnMountOrArgChange: true })
  const [toggleStatus] = useToggleCourseStatusMutation()
  const [requestDeletion] = useRequestCourseDeletionMutation()
  const [openMenuId, setOpenMenuId] = useState(null)
  const [deleteConfirmCourse, setDeleteConfirmCourse] = useState(null)

  if (isLoading) return <Loader text={t('profile.loading_courses')} />

  const handleToggleStatus = async (courseId) => {
    setOpenMenuId(null)
    await toggleStatus(courseId)
  }

  const handleRequestDelete = async (courseId) => {
    setDeleteConfirmCourse(null)
    setOpenMenuId(null)
    await requestDeletion(courseId)
  }

  return (
    <>
      <div className="mb-4">
        <button
          onClick={() => navigate('/courses/create')}
          className="bg-link-hover text-bg-header font-medium px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
        >
          {t('profile.create_new_course')}
        </button>
      </div>

      {!courses || courses.length === 0 ? (
        <div className="bg-bg-header/60 rounded-2xl p-8 text-center">
          <p className="text-text-primary text-lg">{t('profile.no_trainer_courses')}</p>
        </div>
      ) : (
        <>
          {/* Mobile: card layout */}
          <div className="flex flex-col gap-3 sm:hidden">
            {courses.map((course) => (
              <div key={course.id} className="bg-bg-header/60 rounded-2xl p-4 flex flex-col gap-2 relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-text-header truncate">{course.title}</h3>
                    <p className="text-text-primary text-xs mt-1">{course.category_name}</p>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === course.id ? null : course.id)}
                      className="p-1 hover:bg-bg-main/30 rounded-lg transition-colors cursor-pointer"
                    >
                      <MoreVertical size={18} className="text-text-primary" />
                    </button>
                    {openMenuId === course.id && (
                      <CourseActionMenu
                        course={course}
                        onView={() => { setOpenMenuId(null); navigate(`/courses/${course.id}`) }}
                        onEdit={() => { setOpenMenuId(null); navigate(`/courses/${course.id}/edit`) }}
                        onToggleStatus={() => handleToggleStatus(course.id)}
                        onDelete={() => { setOpenMenuId(null); setDeleteConfirmCourse(course) }}
                        onClose={() => setOpenMenuId(null)}
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <StatusBadge status={course.status} />
                  <span className="text-text-primary">{course.purchases_count} {t('profile.students_abbr')}</span>
                  <span className="text-text-header font-medium ml-auto">
                    {Number(course.price).toLocaleString('ru-RU')} UZS
                  </span>
                </div>
                {course.status === 'revision_required' && course.revision_notes && (
                  <div className="flex items-start gap-1.5 text-orange-400 text-xs bg-orange-500/10 rounded-lg px-2.5 py-2">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    <span><span className="font-medium">{t('profile.revision_notes_label')}:</span> {course.revision_notes}</span>
                  </div>
                )}
                {course.deletion_requested && (
                  <div className="flex items-center gap-1 text-amber-400 text-xs">
                    <AlertTriangle size={12} />
                    <span>{t('profile.awaiting_deletion')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden sm:block bg-bg-header/60 rounded-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-text-header/10">
                  <th className="px-5 py-3 text-sm text-text-primary font-medium">{t('profile.table_course')}</th>
                  <th className="px-5 py-3 text-sm text-text-primary font-medium">{t('profile.table_status')}</th>
                  <th className="px-5 py-3 text-sm text-text-primary font-medium text-center">{t('profile.table_students')}</th>
                  <th className="px-5 py-3 text-sm text-text-primary font-medium text-right">{t('profile.table_price')}</th>
                  <th className="px-5 py-3 text-sm text-text-primary font-medium text-right">{t('profile.table_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} className="border-b border-text-header/5 last:border-0">
                    <td className="px-5 py-3">
                      <div>
                        <span className="text-text-header">{course.title}</span>
                        <p className="text-text-primary text-xs">{course.category_name}</p>
                        {course.deletion_requested && (
                          <span className="inline-flex items-center gap-1 text-amber-400 text-xs mt-1">
                            <AlertTriangle size={10} /> {t('profile.awaiting_deletion')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={course.status} />
                      {course.status === 'revision_required' && course.revision_notes && (
                        <p className="text-xs text-orange-400 mt-1 max-w-xs">
                          <span className="font-medium">{t('profile.revision_notes_label')}:</span> {course.revision_notes}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-text-header text-center">{course.purchases_count}</td>
                    <td className="px-5 py-3 text-text-header text-right">
                      {Number(course.price).toLocaleString('ru-RU')} UZS
                    </td>
                    <td className="px-5 py-3 text-right relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === course.id ? null : course.id)}
                        className="p-1 hover:bg-bg-main/30 rounded-lg transition-colors cursor-pointer"
                      >
                        <MoreVertical size={18} className="text-text-primary" />
                      </button>
                      {openMenuId === course.id && (
                        <CourseActionMenu
                          course={course}
                          onView={() => { setOpenMenuId(null); navigate(`/courses/${course.id}`) }}
                          onEdit={() => { setOpenMenuId(null); navigate(`/courses/${course.id}/edit`) }}
                          onToggleStatus={() => handleToggleStatus(course.id)}
                          onDelete={() => { setOpenMenuId(null); setDeleteConfirmCourse(course) }}
                          onClose={() => setOpenMenuId(null)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteConfirmCourse(null)}>
          <div className="bg-bg-header rounded-2xl p-6 w-full max-w-sm mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className="text-amber-400" />
              <h3 className="text-lg font-bold text-text-header">{t('profile.delete_course_title')}</h3>
            </div>
            <p className="text-text-primary text-sm mb-6">
              {deleteConfirmCourse.status === 'draft'
                ? t('profile.delete_course_desc_draft')
                : t('profile.delete_course_desc')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRequestDelete(deleteConfirmCourse.id)}
                className="flex-1 bg-red-500 text-white font-medium py-2 rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
              >
                {deleteConfirmCourse.status === 'draft' ? t('common.delete') : t('profile.send_request')}
              </button>
              <button
                onClick={() => setDeleteConfirmCourse(null)}
                className="flex-1 bg-bg-main/30 text-text-header font-medium py-2 rounded-lg hover:bg-bg-main/50 transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function StatusBadge({ status }) {
  const { t } = useTranslation()
  const styles = {
    published: 'bg-green-500/20 text-green-400',
    pending_review: 'bg-blue-500/20 text-blue-400',
    revision_required: 'bg-orange-500/20 text-orange-400',
    draft: 'bg-yellow-500/20 text-yellow-400',
  }
  const labels = {
    published: t('profile.status_published'),
    pending_review: t('profile.status_pending_review'),
    revision_required: t('profile.status_revision_required'),
    draft: t('profile.status_draft'),
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${styles[status] || styles.draft}`}>
      {labels[status] || t('profile.status_draft')}
    </span>
  )
}

function CourseActionMenu({ course, onView, onEdit, onToggleStatus, onDelete, onClose }) {
  const { t } = useTranslation()
  const isPublished = course.status === 'published'
  const isDraft = course.status === 'draft'
  const isPending = course.status === 'pending_review'
  const isRevision = course.status === 'revision_required'
  const canEdit = isDraft || isRevision

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-bg-header rounded-xl shadow-lg border border-link-hover/20 py-2 animate-fade-in">
        <button
          onClick={onView}
          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-text-header hover:bg-link-hover/10 transition-colors cursor-pointer"
        >
          <Eye size={14} className="opacity-70" /> {t('profile.view_course')}
        </button>
        <button
          onClick={canEdit ? onEdit : undefined}
          disabled={!canEdit}
          className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${canEdit ? 'text-text-header hover:bg-link-hover/10 cursor-pointer' : 'text-text-primary/50 cursor-not-allowed'}`}
        >
          <Edit3 size={14} className="opacity-70" /> {t('profile.edit_course')}
        </button>
        <button
          onClick={isPending ? undefined : onToggleStatus}
          disabled={isPending}
          className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${isPending ? 'text-blue-400/50 cursor-not-allowed' : 'text-text-header hover:bg-link-hover/10 cursor-pointer'}`}
        >
          {isPublished ? (
            <><ToggleLeft size={14} className="opacity-70" /> {t('profile.unpublish')}</>
          ) : isPending ? (
            <><CheckCircle size={14} className="opacity-70" /> {t('profile.status_pending_review')}</>
          ) : isRevision ? (
            <><ToggleRight size={14} className="opacity-70" /> {t('profile.resubmit_review')}</>
          ) : (
            <><ToggleRight size={14} className="opacity-70" /> {t('profile.submit_review')}</>
          )}
        </button>
        <div className="border-t border-text-header/10 my-1" />
        <button
          onClick={onDelete}
          disabled={course.deletion_requested}
          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={14} /> {course.deletion_requested ? t('profile.request_sent') : t('common.delete')}
        </button>
      </div>
    </>
  )
}

// ─── Main Profile Page ────────────────────────────────────────────
function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('profile')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCertsModal, setShowCertsModal] = useState(false)
  const [showTrainerLinksModal, setShowTrainerLinksModal] = useState(false)
  const avatarInputRef = useRef(null)
  const [uploadAvatar, { isLoading: avatarUploading }] = useUploadAvatarMutation()
  const [deleteAvatar] = useDeleteAvatarMutation()

  const token = localStorage.getItem('access_token')
  useEffect(() => {
    if (!token) navigate('/login')
  }, [token, navigate])

  const { data: profile, isLoading: profileLoading } = useGetUserProfileQuery(undefined, { skip: !token })

  const isTrainer = profile?.role === 'trainer'
  const validTabs = isTrainer ? TRAINER_TABS : STUDENT_TABS

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    } else {
      setActiveTab('profile')
    }
  }, [searchParams, isTrainer])

  if (!token) return null
  if (profileLoading) return <Loader text={t('profile.loading')} />

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-red-400">{t('profile.load_error')}</p>
      </div>
    )
  }

  const trainerProfile = profile.trainer_profile

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('avatar', file)
    try {
      await uploadAvatar(formData).unwrap()
    } catch (err) {
      alert(err?.data?.error || t('profile.avatar_upload_error'))
    }
    e.target.value = ''
  }

  const handleAvatarDelete = async () => {
    try {
      await deleteAvatar().unwrap()
    } catch {
      alert(t('profile.avatar_delete_error'))
    }
  }

  const tabs = isTrainer
    ? [
        { key: 'profile', label: t('profile.title') },
        { key: 'overview', label: t('profile.overview') },
        { key: 'trainer-courses', label: t('profile.my_courses') },
      ]
    : [
        { key: 'profile', label: t('profile.title') },
        { key: 'courses', label: t('profile.my_courses') },
        { key: 'history', label: t('profile.purchase_history') },
        { key: 'favorites', label: t('profile.favorites') },
      ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
      {isTrainer && trainerProfile && !trainerProfile.is_verified && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-400 shrink-0" />
          <p className="text-amber-200 text-sm">
            {t('profile.verification_pending')}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={t('profile.avatar')}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-link-hover flex items-center justify-center text-white text-2xl font-bold">
              {profile.first_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          >
            <Camera size={20} className="text-white" />
          </button>
          {profile.avatar_url && (
            <button
              onClick={handleAvatarDelete}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-header">
            {profile.full_name || t('profile.user_default')}
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-text-primary text-sm">{profile.phone}</p>
            {isTrainer && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-link-hover/20 text-link-hover">
                {t('profile.trainer_badge')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-link-hover text-bg-header'
                : 'bg-bg-header/50 text-text-header hover:bg-bg-header/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <ProfileTab
          profile={profile}
          onEdit={() => setShowEditModal(true)}
          onEditCerts={() => setShowCertsModal(true)}
          onEditTrainerLinks={() => setShowTrainerLinksModal(true)}
        />
      )}
      {activeTab === 'courses' && <MyCoursesTab />}
      {activeTab === 'history' && <PurchaseHistoryTab />}
      {activeTab === 'favorites' && <FavoritesTab />}
      {activeTab === 'overview' && <TrainerOverviewTab />}
      {activeTab === 'trainer-courses' && <TrainerCoursesTab />}

      {showEditModal && (
        <EditProfileModal
          profile={profile}
          trainerProfile={trainerProfile}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showCertsModal && (
        <EditCertificatesModal
          certificates={trainerProfile?.certificates || []}
          onClose={() => setShowCertsModal(false)}
        />
      )}

      {showTrainerLinksModal && (
        <EditTrainerLinksModal
          trainerProfile={trainerProfile}
          onClose={() => setShowTrainerLinksModal(false)}
        />
      )}
    </div>
  )
}

export default Profile
