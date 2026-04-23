import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown, ShoppingCart, LogOut, User, Heart, BookOpen, LayoutDashboard } from 'lucide-react'
import { useGetCategoriesQuery } from '../app/api/coursesApi'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { apiSlice } from '../app/api/apiSlice'

function Header() {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const catalogRef = useRef(null)
  const userMenuRef = useRef(null)
  const navigate = useNavigate()

  const { data: categories = [] } = useGetCategoriesQuery()

  const [user, setUser] = useState(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (e) {
        localStorage.removeItem('user')
      }
    }
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (catalogRef.current && !catalogRef.current.contains(e.target)) {
        setCatalogOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Lock body scroll when mobile menu is open
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

  const toggleLang = () => {
    const next = i18n.language === 'ru' ? 'uz' : 'ru'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
    dispatch(apiSlice.util.resetEntireApiState())
  }

  return (
    <header className="bg-bg-header text-text-header sticky top-0 z-50">
      <div className="w-full flex items-center justify-between px-4 py-2">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0">
          <img src="/logo_v2.svg" alt="Fit Evolution" className="h-9 sm:h-10" />
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm hover:text-link-hover transition-colors">
            {t('nav.home')}
          </Link>

          {user && user.role === 'trainer' && (
            <Link
              to="/profile?tab=overview"
              className="text-sm hover:text-link-hover transition-colors"
            >
              {t('nav.dashboard')}
            </Link>
          )}
          {user && user.role !== 'trainer' && (
            <Link
              to="/profile?tab=courses"
              className="text-sm hover:text-link-hover transition-colors"
            >
              {t('nav.my_courses')}
            </Link>
          )}

          {/* Catalog dropdown */}
          <div ref={catalogRef} className="relative">
            <button
              onClick={() => setCatalogOpen(!catalogOpen)}
              className="flex items-center gap-1 text-sm hover:text-link-hover transition-colors cursor-pointer"
            >
              {t('nav.catalog')}
              <ChevronDown
                size={16}
                className={`transition-transform ${catalogOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {catalogOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-bg-header rounded-xl shadow-lg border border-link-hover/20 py-2 animate-fade-in">
                {categories.length === 0 ? (
                  <p className="px-4 py-2 text-sm opacity-60">{t('nav.no_categories')}</p>
                ) : (
                  categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/?category=${cat.slug}`}
                      onClick={() => setCatalogOpen(false)}
                      className="block px-4 py-2 text-sm hover:bg-link-hover/10 transition-colors"
                    >
                      {cat.title}
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          <Link to="/about" className="text-sm hover:text-link-hover transition-colors">
            {t('nav.about')}
          </Link>
        </nav>

        {/* Right side: lang + cart + auth + hamburger */}
        <div className="flex items-center gap-3">
          {/* Language switcher */}
          {/* <button
            onClick={toggleLang}
            className="text-xs font-bold px-2 py-1 rounded-lg bg-link-hover/20 hover:bg-link-hover/30 transition-colors cursor-pointer"
          >
            {i18n.language === 'uz' ? t('lang.uz') : t('lang.ru')}
          </button> */}

          <select
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="text-xs font-bold px-2 py-1 rounded-lg bg-link-hover/20 hover:bg-link-hover/30 transition-colors cursor-pointer"
          >
            <option value="uz" className="bg-link-hover text-bg-header">
              {t('lang.uz')}
            </option>
            <option value="ru" className="bg-link-hover text-bg-header">
              {t('lang.ru')}
            </option>
          </select>

          {/* Cart */}
          <button className="relative hover:text-link-hover transition-colors cursor-pointer p-1">
            <ShoppingCart size={22} />
            <span className="absolute -top-1 -right-1 bg-link-hover text-bg-header text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
              0
            </span>
          </button>

          {/* Desktop auth */}
          <div className="hidden md:block">
            {!user ? (
              <button
                onClick={() => navigate('/login')}
                className="text-sm bg-link-hover text-bg-header px-4 py-2 rounded-full font-medium hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2"
              >
                <span>{t('nav.login')}</span>
              </button>
            ) : (
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-link-hover flex items-center justify-center text-white text-sm font-bold">
                    {user.first_name?.[0]?.toUpperCase() || user.phone?.[0] || '?'}
                  </div>
                  <span className="text-sm max-w-30 truncate">{user.full_name || user.phone}</span>
                </button>

                {userMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-bg-header rounded-xl shadow-lg border border-link-hover/20 py-2 animate-fade-in">
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-link-hover/10 transition-colors"
                    >
                      <User size={16} className="opacity-70" /> {t('nav.profile')}
                    </Link>
                    {user.role === 'trainer' ? (
                      <>
                        <Link
                          to="/profile?tab=overview"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-link-hover/10 transition-colors"
                        >
                          <LayoutDashboard size={16} className="opacity-70" /> {t('nav.dashboard')}
                        </Link>
                        <Link
                          to="/profile?tab=trainer-courses"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-link-hover/10 transition-colors"
                        >
                          <BookOpen size={16} className="opacity-70" /> {t('nav.my_courses')}
                        </Link>
                        <Link
                          to="/courses/create"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-link-hover hover:bg-link-hover/10 transition-colors font-medium"
                        >
                          {t('nav.create_course')}
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/profile?tab=courses"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-link-hover/10 transition-colors"
                        >
                          <BookOpen size={16} className="opacity-70" /> {t('nav.my_courses')}
                        </Link>
                        <Link
                          to="/profile?tab=favorites"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-link-hover/10 transition-colors"
                        >
                          <Heart size={16} className="opacity-70" /> {t('nav.favorites')}
                        </Link>
                      </>
                    )}
                    <div className="border-t border-text-header/10 my-2" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 text-left px-4 py-2 text-sm hover:bg-red-500/10 text-red-400 transition-colors cursor-pointer"
                    >
                      <LogOut size={16} /> {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1 hover:text-link-hover transition-colors cursor-pointer"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 top-13 bg-black/50 z-40 md:hidden" onClick={closeMobile} />

          {/* Slide-down panel */}
          <div className="fixed left-0 right-0 top-13 z-50 md:hidden bg-bg-header border-t border-link-hover/10 shadow-2xl animate-fade-in max-h-[calc(100vh-3.25rem)] overflow-y-auto">
            <nav className="flex flex-col p-4 gap-1">
              <Link
                to="/"
                onClick={closeMobile}
                className="px-4 py-3 rounded-xl text-sm font-medium hover:bg-link-hover/10 transition-colors"
              >
                {t('nav.home')}
              </Link>

              {user && user.role === 'trainer' && (
                <Link
                  to="/profile?tab=overview"
                  onClick={closeMobile}
                  className="px-4 py-3 rounded-xl text-sm font-medium hover:bg-link-hover/10 transition-colors"
                >
                  {t('nav.dashboard')}
                </Link>
              )}
              {user && user.role !== 'trainer' && (
                <Link
                  to="/profile?tab=courses"
                  onClick={closeMobile}
                  className="px-4 py-3 rounded-xl text-sm font-medium hover:bg-link-hover/10 transition-colors"
                >
                  {t('nav.my_courses')}
                </Link>
              )}

              <Link
                to="/about"
                onClick={closeMobile}
                className="px-4 py-3 rounded-xl text-sm font-medium hover:bg-link-hover/10 transition-colors"
              >
                {t('nav.about')}
              </Link>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="mt-2 pt-3 border-t border-text-header/10">
                  <p className="px-4 py-2 text-xs font-medium uppercase tracking-wider text-text-primary/50">
                    {t('nav.catalog')}
                  </p>
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/?category=${cat.slug}`}
                      onClick={closeMobile}
                      className="block px-4 py-2.5 rounded-xl text-sm hover:bg-link-hover/10 transition-colors text-text-primary"
                    >
                      {cat.title}
                    </Link>
                  ))}
                </div>
              )}

              {/* Auth section */}
              <div className="mt-2 pt-3 border-t border-text-header/10">
                {!user ? (
                  <button
                    onClick={() => { closeMobile(); navigate('/login') }}
                    className="w-full text-sm bg-link-hover text-bg-header px-4 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    {t('nav.login_with_telegram')}
                  </button>
                ) : (
                  <>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-10 h-10 rounded-full bg-link-hover flex items-center justify-center text-white font-bold">
                        {user.first_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-header truncate">
                          {user.full_name || t('nav.user')}
                        </p>
                        <p className="text-xs text-text-primary/60 truncate">{user.phone}</p>
                      </div>
                    </div>

                    <Link
                      to="/profile"
                      onClick={closeMobile}
                      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm hover:bg-link-hover/10 transition-colors"
                    >
                      <User size={16} className="opacity-70" /> {t('nav.profile')}
                    </Link>
                    {user.role === 'trainer' ? (
                      <>
                        <Link
                          to="/profile?tab=trainer-courses"
                          onClick={closeMobile}
                          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm hover:bg-link-hover/10 transition-colors"
                        >
                          <BookOpen size={16} className="opacity-70" /> {t('nav.my_courses')}
                        </Link>
                        <Link
                          to="/courses/create"
                          onClick={closeMobile}
                          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-link-hover hover:bg-link-hover/10 transition-colors font-medium"
                        >
                          {t('nav.create_course')}
                        </Link>
                      </>
                    ) : (
                      <Link
                        to="/profile?tab=favorites"
                        onClick={closeMobile}
                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm hover:bg-link-hover/10 transition-colors"
                      >
                        <Heart size={16} className="opacity-70" /> {t('nav.favorites')}
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 rounded-xl text-sm hover:bg-red-500/10 text-red-400 transition-colors cursor-pointer mt-1"
                    >
                      <LogOut size={16} /> {t('nav.logout')}
                    </button>
                  </>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  )
}

export default Header
