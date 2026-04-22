import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useLinkAccountMutation, useSocialRegisterMutation } from '../app/api/usersApi'

const providerNames = {
  telegram: 'Telegram',
  google: 'Google',
}

function SocialLink() {
  const navigate = useNavigate()
  const location = useLocation()
  const { socialToken, provider, socialName, socialEmail } = location.state || {}

  const [tab, setTab] = useState('link') // 'link' | 'register'
  const [error, setError] = useState('')

  // Link form
  const [linkForm, setLinkForm] = useState({ phone: '', password: '' })
  // Register form
  const [regForm, setRegForm] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    firstName: socialName || '',
    lastName: '',
  })

  const [linkAccount, { isLoading: linkLoading }] = useLinkAccountMutation()
  const [socialRegister, { isLoading: regLoading }] = useSocialRegisterMutation()

  const loading = linkLoading || regLoading

  // Если нет socialToken — редирект на login
  if (!socialToken) {
    navigate('/login', { replace: true })
    return null
  }

  const saveAndRedirect = (data) => {
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    localStorage.setItem('user', JSON.stringify(data.user))
    window.location.href = '/'
  }

  const handleLink = async (e) => {
    e.preventDefault()
    setError('')

    if (!linkForm.phone || !linkForm.password) {
      setError('Заполните номер телефона и пароль')
      return
    }

    try {
      const data = await linkAccount({
        socialToken,
        phone: linkForm.phone,
        password: linkForm.password,
      }).unwrap()
      saveAndRedirect(data)
    } catch (err) {
      const detail = err?.data?.detail || err?.data?.non_field_errors?.[0]
      setError(detail || 'Ошибка при привязке аккаунта')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    if (!regForm.phone || !regForm.password) {
      setError('Заполните номер телефона и пароль')
      return
    }

    if (regForm.password.length < 6) {
      setError('Пароль должен быть минимум 6 символов')
      return
    }

    if (regForm.password !== regForm.confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    try {
      const data = await socialRegister({
        socialToken,
        phone: regForm.phone,
        password: regForm.password,
        firstName: regForm.firstName,
        lastName: regForm.lastName,
      }).unwrap()
      saveAndRedirect(data)
    } catch (err) {
      const detail = err?.data?.detail
      setError(detail || 'Ошибка при регистрации')
    }
  }

  const inputClass =
    'w-full px-4 py-2.5 rounded-xl bg-bg-header/40 text-text-header placeholder:text-text-primary/40 border border-bg-header/60 focus:outline-none focus:border-link-hover focus:bg-bg-header/60 transition-colors'

  const tabClass = (active) =>
    `flex-1 py-2.5 text-center rounded-xl font-medium transition-colors cursor-pointer ${
      active
        ? 'bg-link-hover text-bg-header'
        : 'text-text-primary/70 hover:text-text-header'
    }`

  return (
    <div className="flex flex-col items-center justify-center px-4 py-10">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-header mb-2">
            Привязка аккаунта
          </h1>
          <p className="text-text-primary/70">
            Вы вошли через {providerNames[provider] || provider}
            {socialName ? ` как ${socialName}` : ''}
            {socialEmail ? ` (${socialEmail})` : ''}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-bg-header/20 rounded-xl p-1">
          <button className={tabClass(tab === 'link')} onClick={() => { setTab('link'); setError('') }}>
            У меня есть аккаунт
          </button>
          <button className={tabClass(tab === 'register')} onClick={() => { setTab('register'); setError('') }}>
            Новый аккаунт
          </button>
        </div>

        {/* Link existing account */}
        {tab === 'link' && (
          <div className="bg-bg-header/40 rounded-2xl p-6">
            <h3 className="font-bold text-text-header mb-2">
              Привязать к существующему аккаунту
            </h3>
            <p className="text-text-primary/60 text-sm mb-4">
              Введите номер телефона и пароль вашего аккаунта, чтобы привязать {providerNames[provider] || provider}
            </p>
            <form onSubmit={handleLink} className="flex flex-col gap-3">
              <input
                type="tel"
                value={linkForm.phone}
                onChange={(e) => setLinkForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+998 90 123 45 67"
                className={inputClass}
                required
              />
              <input
                type="password"
                value={linkForm.password}
                onChange={(e) => setLinkForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Пароль"
                className={inputClass}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-link-hover text-bg-header py-3 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {linkLoading ? 'Привязываем...' : 'Привязать аккаунт'}
              </button>
            </form>
          </div>
        )}

        {/* Register new account */}
        {tab === 'register' && (
          <div className="bg-bg-header/40 rounded-2xl p-6">
            <h3 className="font-bold text-text-header mb-2">
              Создать новый аккаунт
            </h3>
            <p className="text-text-primary/60 text-sm mb-4">
              Укажите номер телефона и пароль для нового аккаунта
            </p>
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <input
                type="tel"
                value={regForm.phone}
                onChange={(e) => setRegForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+998 90 123 45 67"
                className={inputClass}
                required
              />
              <input
                type="password"
                value={regForm.password}
                onChange={(e) => setRegForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Пароль (минимум 6 символов)"
                className={inputClass}
                required
              />
              <input
                type="password"
                value={regForm.confirmPassword}
                onChange={(e) => setRegForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Подтвердите пароль"
                className={inputClass}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={regForm.firstName}
                  onChange={(e) => setRegForm((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="Имя"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={regForm.lastName}
                  onChange={(e) => setRegForm((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder="Фамилия"
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-link-hover text-bg-header py-3 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {regLoading ? 'Создаём...' : 'Зарегистрироваться'}
              </button>
            </form>
          </div>
        )}

        <Link
          to="/login"
          className="block text-center text-text-primary/50 hover:text-text-primary/70 text-sm mt-6"
        >
          &larr; Вернуться на страницу входа
        </Link>
      </div>
    </div>
  )
}

export default SocialLink
