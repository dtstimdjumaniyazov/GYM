import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Loader from '../components/Loader'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

/**
 * Страница для авторизации через Telegram Mini App (Web App).
 * Если открыта не в Telegram — редиректит на /login (виджет).
 */
function TelegramLogin() {
  const navigate = useNavigate()

  useEffect(() => {
    // Если не в Telegram WebApp — перенаправляем на обычную страницу входа
    if (!window.Telegram?.WebApp?.initData) {
      navigate('/login', { replace: true })
      return
    }

    const webapp = window.Telegram.WebApp
    webapp.ready()

    const initData = webapp.initData

    const authenticate = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/auth/telegram/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ init_data: initData }),
        })

        const data = await response.json()

        if (!response.ok) {
          console.error('Telegram WebApp auth error:', data)
          navigate('/login', { replace: true })
          return
        }

        if (data.status === 'pending_link') {
          navigate('/social-link', {
            state: {
              socialToken: data.social_token,
              provider: data.provider,
              socialName: data.social_name,
            },
            replace: true,
          })
          return
        }

        localStorage.setItem('access_token', data.access)
        localStorage.setItem('refresh_token', data.refresh)
        localStorage.setItem('user', JSON.stringify(data.user))

        navigate('/', { replace: true })
      } catch (err) {
        console.error('Telegram WebApp auth failed:', err)
        navigate('/login', { replace: true })
      }
    }

    authenticate()
  }, [navigate])

  return <Loader text="Авторизация через Telegram..." />
}

export default TelegramLogin
