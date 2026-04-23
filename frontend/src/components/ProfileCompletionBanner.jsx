import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function ProfileCompletionBanner() {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('profile_banner_dismissed') === 'true'
  )
  const [isComplete, setIsComplete] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      return user.is_profile_complete !== false
    } catch {
      return true
    }
  })

  useEffect(() => {
    const handleStorage = () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        setIsComplete(user.is_profile_complete !== false)
      } catch {
        setIsComplete(true)
      }
    }
    window.addEventListener('storage', handleStorage)
    // Also poll localStorage for same-tab updates
    const interval = setInterval(handleStorage, 1000)
    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])

  if (dismissed || isComplete) return null

  const handleDismiss = () => {
    sessionStorage.setItem('profile_banner_dismissed', 'true')
    setDismissed(true)
  }

  return (
    <div className="mx-3 mt-3 sm:mx-4 md:mx-6 lg:mx-8 p-3 rounded-xl bg-link-hover/10 border border-link-hover/30 flex items-center justify-between gap-3">
      <p className="text-text-header text-sm">
        Заполните профиль для полного доступа ко всем функциям
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/profile"
          className="text-sm font-medium text-link-hover hover:underline"
        >
          Перейти в профиль
        </Link>
        <button
          onClick={handleDismiss}
          className="text-text-primary/50 hover:text-text-primary/80 transition-colors cursor-pointer"
          aria-label="Закрыть"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default ProfileCompletionBanner
