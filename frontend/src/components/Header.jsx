import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, ChevronDown, LogOut, User, Heart, BookOpen, LayoutDashboard, Bell } from 'lucide-react'
import { useGetCategoriesQuery } from '../app/api/coursesApi'
import { useGetUserProfileQuery } from '../app/api/usersApi'
import { useGetNotificationsQuery, useMarkAllReadMutation } from '../app/api/notificationsApi'
import { useTranslation } from 'react-i18next'

function Header() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const catalogRef = useRef(null)
  const userMenuRef = useRef(null)
  const notifRef = useRef(null)
  const navigate = useNavigate()

  const { data: categories = [] } = useGetCategoriesQuery()

  const [user, setUser] = useState(null)
  const { data: profile } = useGetUserProfileQuery(undefined, { skip: !user })
  const avatarUrl = profile?.avatar_url || null

  const { data: notifications = [] } = useGetNotificationsQuery(undefined, {
    skip: !user,
    pollingInterval: 30000,
    skipPollingIfUnfocused: true,
  })
  const [markAllRead] = useMarkAllReadMutation()
  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleNotifOpen = () => {
    setNotifOpen((v) => !v)
    if (!notifOpen && unreadCount > 0) markAllRead()
  }

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch {
        localStorage.removeItem('user')
      }
    }
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (catalogRef.current && !catalogRef.current.contains(e.target)) setCatalogOpen(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
    setUserMenuOpen(false)
    setMobileMenuOpen(false)
    navigate('/')
  }

  const closeMobile = () => setMobileMenuOpen(false)

  return (
    <header className="bg-bg-header text-text-header sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-2">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0">
            <img src="/logo_v2-1.png" alt="Fit Evolution" className="h-9 sm:h-10" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            <NavPill to="/" active={location.pathname === '/'} label={t('nav.home')} />

            {user && user.role === 'trainer' && (
              <NavPill to="/profile?tab=overview" active={location.pathname === '/profile'} label={t('nav.dashboard')} />
            )}
            {user && user.role !== 'trainer' && (
              <NavPill to="/profile?tab=courses" active={location.pathname === '/profile'} label={t('nav.my_courses')} />
            )}

            {/* Catalog dropdown */}
            <div ref={catalogRef} className="relative">
              <button
                onClick={() => setCatalogOpen(!catalogOpen)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  catalogOpen ? 'text-white bg-white/12' : 'text-white/70 hover:text-white hover:bg-white/8'
                }`}
              >
                {t('nav.catalog')}
                <ChevronDown size={14} className={`transition-transform duration-200 ${catalogOpen ? 'rotate-180' : ''}`} />
              </button>

              {catalogOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 animate-fade-in">
                  {categories.length === 0 ? (
                    <p className="px-4 py-2.5 text-sm text-gray-400">{t('nav.no_categories')}</p>
                  ) : (
                    categories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/?category=${cat.slug}`}
                        onClick={() => setCatalogOpen(false)}
                        className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-bg-main transition-colors"
                      >
                        {cat.title}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>

            <NavPill to="/about" active={location.pathname === '/about'} label={t('nav.about')} />
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-1.5">
            {/* Language switcher */}
            <select
              value={i18n.language}
              onChange={(e) => {
                localStorage.setItem('lang', e.target.value)
                window.location.reload()
              }}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer border border-white/10"
            >
              <option value="uz" className="bg-bg-header text-white">UZ</option>
              <option value="ru" className="bg-bg-header text-white">RU</option>
            </select>

            {/* Notification bell */}
            {user && (
              <div ref={notifRef} className="relative">
                <button
                  onClick={handleNotifOpen}
                  className="relative p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Уведомления"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 animate-fade-in z-50 max-h-[70vh] overflow-y-auto">
                    <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800">Уведомления</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-bg-main hover:underline cursor-pointer">
                          Прочитать все
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-400 text-center">Уведомлений нет</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => { if (n.related_url) navigate(n.related_url); setNotifOpen(false) }}
                          className={`px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${n.related_url ? 'cursor-pointer hover:bg-gray-50' : ''} ${!n.is_read ? 'bg-blue-50/60' : ''}`}
                        >
                          <div className="flex items-start gap-2">
                            {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full bg-bg-main shrink-0" />}
                            <div className={!n.is_read ? '' : 'ml-4'}>
                              <p className="text-sm font-medium text-gray-800 leading-snug">{n.title}</p>
                              {n.body && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>}
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(n.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Desktop auth */}
            <div className="hidden md:block">
              {!user ? (
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm bg-bg-main text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-bg-main/85 transition-colors cursor-pointer ml-1"
                >
                  {t('nav.login')}
                </button>
              ) : (
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-950 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
                      {avatarUrl
                        ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                        : (user.first_name?.[0]?.toUpperCase() || user.phone?.[0] || '?')
                      }
                    </div>
                    <span className="text-sm font-medium max-w-28 truncate text-white/90">
                      {user.full_name || user.phone}
                    </span>
                    <ChevronDown size={13} className={`text-white/40 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute top-full right-0 mt-1.5 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 animate-fade-in">
                      <div className="px-4 py-2.5 border-b border-gray-100 mb-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{user.full_name || user.phone}</p>
                        {user.full_name && <p className="text-xs text-gray-400 mt-0.5">{user.phone}</p>}
                      </div>
                      <DropdownLink to="/profile" onClick={() => setUserMenuOpen(false)} icon={<User size={15} />} label={t('nav.profile')} />
                      {user.role === 'trainer' ? (
                        <>
                          <DropdownLink to="/profile?tab=overview" onClick={() => setUserMenuOpen(false)} icon={<LayoutDashboard size={15} />} label={t('nav.dashboard')} />
                          <DropdownLink to="/profile?tab=trainer-courses" onClick={() => setUserMenuOpen(false)} icon={<BookOpen size={15} />} label={t('nav.my_courses')} />
                          <Link
                            to="/courses/create"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-bg-main font-semibold hover:bg-blue-50 transition-colors"
                          >
                            {t('nav.create_course')}
                          </Link>
                        </>
                      ) : (
                        <>
                          <DropdownLink to="/profile?tab=courses" onClick={() => setUserMenuOpen(false)} icon={<BookOpen size={15} />} label={t('nav.my_courses')} />
                          <DropdownLink to="/profile?tab=favorites" onClick={() => setUserMenuOpen(false)} icon={<Heart size={15} />} label={t('nav.favorites')} />
                        </>
                      )}
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <LogOut size={15} /> {t('nav.logout')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 top-13 bg-black/40 z-40 md:hidden" onClick={closeMobile} />
          <div className="fixed left-0 right-0 top-13 z-50 md:hidden bg-white border-t border-gray-100 shadow-2xl animate-fade-in max-h-[calc(100vh-3.25rem)] overflow-y-auto">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
              <nav className="flex flex-col gap-0.5">
                <MobileNavLink to="/" onClick={closeMobile} label={t('nav.home')} />
                {user && user.role === 'trainer' && (
                  <MobileNavLink to="/profile?tab=overview" onClick={closeMobile} label={t('nav.dashboard')} />
                )}
                {user && user.role !== 'trainer' && (
                  <MobileNavLink to="/profile?tab=courses" onClick={closeMobile} label={t('nav.my_courses')} />
                )}
                <MobileNavLink to="/about" onClick={closeMobile} label={t('nav.about')} />

                {categories.length > 0 && (
                  <div className="mt-2 pt-3 border-t border-gray-100">
                    <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                      {t('nav.catalog')}
                    </p>
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/?category=${cat.slug}`}
                        onClick={closeMobile}
                        className="block px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:text-bg-main transition-colors"
                      >
                        {cat.title}
                      </Link>
                    ))}
                  </div>
                )}

                <div className="mt-2 pt-3 border-t border-gray-100">
                  {!user ? (
                    <button
                      onClick={() => { closeMobile(); navigate('/login') }}
                      className="w-full text-sm bg-bg-main text-white px-4 py-3 rounded-xl font-semibold hover:bg-bg-main/90 transition-colors cursor-pointer"
                    >
                      {t('nav.login')}
                    </button>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 px-3 py-3 mb-1">
                        <div className="w-10 h-10 rounded-full bg-bg-main flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
                          {avatarUrl
                            ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                            : (user.first_name?.[0]?.toUpperCase() || '?')
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{user.full_name || t('nav.user')}</p>
                          <p className="text-xs text-gray-400 truncate">{user.phone}</p>
                        </div>
                      </div>
                      <MobileNavLink to="/profile" onClick={closeMobile} label={t('nav.profile')} icon={<User size={15} />} />
                      {user.role === 'trainer' ? (
                        <>
                          <MobileNavLink to="/profile?tab=trainer-courses" onClick={closeMobile} label={t('nav.my_courses')} icon={<BookOpen size={15} />} />
                          <Link
                            to="/courses/create"
                            onClick={closeMobile}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-bg-main font-semibold hover:bg-blue-50 transition-colors"
                          >
                            {t('nav.create_course')}
                          </Link>
                        </>
                      ) : (
                        <MobileNavLink to="/profile?tab=favorites" onClick={closeMobile} label={t('nav.favorites')} icon={<Heart size={15} />} />
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer mt-1"
                      >
                        <LogOut size={15} /> {t('nav.logout')}
                      </button>
                    </>
                  )}
                </div>
              </nav>
            </div>
          </div>
        </>
      )}
    </header>
  )
}

function NavPill({ to, active, label }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'text-white bg-white/12' : 'text-white/70 hover:text-white hover:bg-white/8'
      }`}
    >
      {label}
    </Link>
  )
}

function DropdownLink({ to, onClick, icon, label }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <span className="text-gray-400">{icon}</span>
      {label}
    </Link>
  )
}

function MobileNavLink({ to, onClick, label, icon }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
    >
      {icon && <span className="text-gray-400">{icon}</span>}
      {label}
    </Link>
  )
}

export default Header
