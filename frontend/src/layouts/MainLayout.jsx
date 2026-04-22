import { Outlet, Link } from 'react-router-dom'
import Header from '../components/Header'
import ProfileCompletionBanner from '../components/ProfileCompletionBanner'

function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-main text-text-primary">
      <Header />
      <ProfileCompletionBanner />

      <main className="flex-1 w-full px-3 py-4 sm:px-4 md:px-6 lg:px-8">
        <Outlet />
      </main>

      <footer className="bg-bg-header text-text-header px-4 py-6 text-center text-xs">
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-2">
          <Link to="/terms" className="hover:underline opacity-80 hover:opacity-100">Пользовательское соглашение</Link>
          <Link to="/privacy" className="hover:underline opacity-80 hover:opacity-100">Политика конфиденциальности</Link>
          <Link to="/medical-disclaimer" className="hover:underline opacity-80 hover:opacity-100">Медицинский дисклеймер</Link>
          <Link to="/payment-rules" className="hover:underline opacity-80 hover:opacity-100">Правила оплаты и возврата</Link>
        </div>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-3">
          <Link to="/trainer-agreement" className="hover:underline opacity-60 hover:opacity-80">Договор для тренеров</Link>
          <Link to="/content-rights" className="hover:underline opacity-60 hover:opacity-80">Права на контент</Link>
          <Link to="/responsibility-disclaimer" className="hover:underline opacity-60 hover:opacity-80">Разграничение ответственности</Link>
          <Link to="/trainer-payment-rules" className="hover:underline opacity-60 hover:opacity-80">Правила выплат тренерам</Link>
          <Link to="/content-removal-rules" className="hover:underline opacity-60 hover:opacity-80">Правила удаления контента</Link>
        </div>
        <p className="opacity-60">&copy; 2026 Fit Evolution</p>
      </footer>
    </div>
  )
}

export default MainLayout
