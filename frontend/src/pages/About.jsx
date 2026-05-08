import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function About() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <section className="bg-bg-header text-white py-20 px-4 text-center">
        <h1 className="text-4xl font-extrabold mb-4">{t('about.hero_title')}</h1>
        <p className="text-lg text-white/70 max-w-2xl mx-auto">{t('about.hero_subtitle')}</p>
      </section>

      {/* Mission */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('about.mission_title')}</h2>
        <p className="text-gray-600 text-lg leading-relaxed">{t('about.mission_text')}</p>
      </section>

      {/* For students / for trainers */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">

          <div className="rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{t('about.for_students_title')}</h3>
            <ul className="space-y-3 text-gray-600">
              {[0,1,2,3].map(i => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-bg-main mt-1 font-bold">✓</span>
                  <span>{t(`about.students_point_${i}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-bg-header text-white p-8">
            <div className="text-4xl mb-4">💪</div>
            <h3 className="text-xl font-bold mb-3">{t('about.for_trainers_title')}</h3>
            <ul className="space-y-3 text-white/80">
              {[0,1,2,3].map(i => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-bold mt-1">✓</span>
                  <span>{t(`about.trainers_point_${i}`)}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">{t('about.how_title')}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[0,1,2].map(i => (
              <div key={i} className="text-center p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-bg-main text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {i + 1}
                </div>
                <h4 className="font-bold text-gray-900 mb-2">{t(`about.step_${i}_title`)}</h4>
                <p className="text-sm text-gray-600">{t(`about.step_${i}_text`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('about.cta_title')}</h2>
        <p className="text-gray-600 mb-8">{t('about.cta_subtitle')}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/courses/create"
            className="bg-bg-main text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition"
          >
            {t('about.cta_trainer')}
          </Link>
          <Link
            to="/"
            className="bg-white border border-bg-main text-bg-main px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
          >
            {t('about.cta_student')}
          </Link>
        </div>
      </section>

    </div>
  )
}

export default About
