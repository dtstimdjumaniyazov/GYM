import { Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
import About from './pages/About'
import CourseDetail from './pages/CourseDetail'
import CourseLessons from './pages/CourseLessons'
import Login from './pages/Login'
import Register from './pages/Register'
import TelegramLogin from './pages/TelegramLogin'
import Profile from './pages/Profile'
import SocialLink from './pages/SocialLink'
import TrainerDetail from './pages/TrainerDetail'
import CourseCreate from './pages/CourseCreate'
import Terms from './pages/legal/Terms'
import Privacy from './pages/legal/Privacy'
import MedicalDisclaimer from './pages/legal/MedicalDisclaimer'
import PaymentRules from './pages/legal/PaymentRules'
import TrainerAgreement from './pages/legal/TrainerAgreement'
import ContentRights from './pages/legal/ContentRights'
import ResponsibilityDisclaimer from './pages/legal/ResponsibilityDisclaimer'
import TrainerPaymentRules from './pages/legal/TrainerPaymentRules'
import ContentRemovalRules from './pages/legal/ContentRemovalRules'
import NotFound from './pages/NotFound'
import './App.css'

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/courses/create" element={<CourseCreate />} />
        <Route path="/courses/:id" element={<CourseDetail />} />
        <Route path="/courses/:id/lessons" element={<CourseLessons />} />
        <Route path="/trainers/:id" element={<TrainerDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/social-link" element={<SocialLink />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/medical-disclaimer" element={<MedicalDisclaimer />} />
        <Route path="/payment-rules" element={<PaymentRules />} />
        <Route path="/trainer-agreement" element={<TrainerAgreement />} />
        <Route path="/content-rights" element={<ContentRights />} />
        <Route path="/responsibility-disclaimer" element={<ResponsibilityDisclaimer />} />
        <Route path="/trainer-payment-rules" element={<TrainerPaymentRules />} />
        <Route path="/content-removal-rules" element={<ContentRemovalRules />} />
      </Route>
      <Route path="/telegram-login" element={<TelegramLogin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
