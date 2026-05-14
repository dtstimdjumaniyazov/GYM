import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

function BannerCarousel({ className = 'rounded-2xl' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const banners = [
    { src: '/banners/banner_3.jpg', title: t('home.banner_3_title'), subtitle: t('home.banner_3_subtitle') },
    { src: '/banners/banner_1.jpg', title: t('home.banner_1_title'), subtitle: t('home.banner_1_subtitle') },
    // { src: '/banners/banner_2.jpg', title: t('home.banner_2_title'), subtitle: t('home.banner_2_subtitle') },
    { src: '/banners/banner_4.jpg', title: t('home.banner_4_title'), subtitle: t('home.banner_4_subtitle') },
  ]
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef(0)

  const SLIDE_DURATION = 6000

  const goTo = useCallback(
    (index) => {
      setCurrentIndex(((index % banners.length) + banners.length) % banners.length)
    },
    [banners.length],
  )

  const handleCta = () => {
    const el = document.getElementById('courses-section')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else navigate('/#courses')
  }

  // Auto-play with smooth progress bar (rAF-driven)
  useEffect(() => {
    if (isPaused) return
    setProgress(0)
    const start = Date.now()
    let raf

    const tick = () => {
      const elapsed = Date.now() - start
      const pct = Math.min((elapsed / SLIDE_DURATION) * 100, 100)
      setProgress(pct)

      if (pct >= 100) {
        setCurrentIndex((prev) => (prev + 1) % banners.length)
        return
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPaused, currentIndex, banners.length])

  // Touch swipe
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) goTo(currentIndex + (diff > 0 ? 1 : -1))
  }

  return (
    <div
      className={`relative w-full overflow-hidden group ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Height container */}
      <div className="relative w-full h-48 sm:h-60 md:h-72 lg:h-80 xl:h-90">
        {/* Dark base matching banner backgrounds */}
        <div className="absolute inset-0 bg-[#0a0e23]" />

        {/* Slides with crossfade + subtle scale */}
        {banners.map((banner, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-all duration-900 ease-out ${
              i === currentIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.03]'
            }`}
          >
            <img
              src={banner.src}
              alt={`Banner ${i + 1}`}
              className={`w-full h-full object-cover will-change-transform ${
                i === currentIndex ? 'animate-ken-burns' : ''
              }`}
            />
          </div>
        ))}

        {/* Edge gradients for seamless blending */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Bottom — fades into page bg-main */}
          <div
            className="absolute bottom-0 inset-x-0 h-2/5"
            style={{
              background:
                'linear-gradient(to top, var(--color-bg-main) 0%, rgba(83,101,202,0.4) 50%, transparent 100%)',
            }}
          />
          {/* Left vignette */}
          <div
            className="absolute inset-y-0 left-0 w-20 sm:w-32"
            style={{ background: 'linear-gradient(to right, rgba(10,14,35,0.8), transparent)' }}
          />
          {/* Right vignette */}
          <div
            className="absolute inset-y-0 right-0 w-20 sm:w-32"
            style={{ background: 'linear-gradient(to left, rgba(10,14,35,0.8), transparent)' }}
          />
          {/* Top subtle darkening */}
          <div
            className="absolute top-0 inset-x-0 h-20"
            style={{ background: 'linear-gradient(to bottom, rgba(10,14,35,0.5), transparent)' }}
          />
        </div>

        {/* Text overlay */}
        <div className="absolute inset-0 z-10 flex items-center pointer-events-none">
          <div className="px-6 sm:px-10 lg:px-14 w-full max-w-2xl">
            {banners.map((banner, i) => (
              <div
                key={i}
                className={`flex flex-col gap-2 sm:gap-3 transition-all duration-700 ${
                  i === currentIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 absolute'
                }`}
              >
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight drop-shadow-lg">
                  {banner.title}
                </h2>
                <p className="text-sm sm:text-base text-white/80 leading-snug drop-shadow max-w-md">
                  {banner.subtitle}
                </p>
                
              </div>
            ))}
          </div>
        </div>

        {/* Navigation arrows — appear on hover, hidden on mobile */}
        <button
          onClick={() => goTo(currentIndex - 1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/25 backdrop-blur-md border border-white/8 hidden sm:flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 hover:border-white/20 transition-all duration-300 opacity-0 group-hover:opacity-100 cursor-pointer"
          aria-label="Previous"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <button
          onClick={() => goTo(currentIndex + 1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/25 backdrop-blur-md border border-white/8 hidden sm:flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 hover:border-white/20 transition-all duration-300 opacity-0 group-hover:opacity-100 cursor-pointer"
          aria-label="Next"
        >
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>

        {/* Indicator pills with progress */}
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/20 backdrop-blur-md border border-white/6">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="relative rounded-full overflow-hidden transition-all duration-500 cursor-pointer"
              style={{ width: i === currentIndex ? 32 : 8, height: 6 }}
              aria-label={`Banner ${i + 1}`}
            >
              {/* Track */}
              <div className="absolute inset-0 bg-white/20 rounded-full" />
              {/* Progress fill (active) or dot fill (inactive) */}
              {i === currentIndex ? (
                <div
                  className="absolute inset-0 rounded-full bg-white"
                  style={{ transform: `scaleX(${progress / 100})`, transformOrigin: 'left' }}
                />
              ) : (
                <div className="absolute inset-0 bg-white/40 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BannerCarousel
