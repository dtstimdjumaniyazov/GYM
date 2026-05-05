import { useRef, useEffect, useState } from 'react'
import Player from '@vimeo/player'

function VimeoPlayer({ vimeoId, autoplay = false, watermark, onEnded, onTimeUpdate }) {
  const outerRef = useRef(null)
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const onEndedRef = useRef(onEnded)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { onEndedRef.current = onEnded }, [onEnded])
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate }, [onTimeUpdate])

  useEffect(() => {
    const el = containerRef.current
    if (!el || !vimeoId) return

    setReady(false)
    setError(null)
    el.innerHTML = ''

    const player = new Player(el, {
      id: Number(vimeoId),
      responsive: true,
      dnt: true,
      autoplay,
      title: false,
      byline: false,
      portrait: false,
      like: false,
      share: false,
    })

    let destroyed = false
    playerRef.current = player

    player.ready().then(() => {
      if (!destroyed) setReady(true)
    }).catch(() => {})

    player.on('error', (err) => {
      if (destroyed) return
      setReady(true)
      setError(err.message || 'Ошибка загрузки видео')
    })
    player.on('ended', () => {
      if (!destroyed) onEndedRef.current?.()
    })
    player.on('timeupdate', (data) => {
      if (!destroyed) onTimeUpdateRef.current?.(data)
    })

    return () => {
      destroyed = true
      player.off('error')
      player.off('ended')
      player.off('timeupdate')
      player.destroy().catch(() => {})
      playerRef.current = null
    }
  }, [vimeoId])

  // When Vimeo's iframe goes fullscreen, intercept and make our outer container
  // go fullscreen instead — so the watermark overlay is included.
  useEffect(() => {
    const outer = outerRef.current
    if (!outer) return
    let busy = false

    const onFSChange = async () => {
      if (busy) return
      const fs = document.fullscreenElement ?? document.webkitFullscreenElement
      if (fs && fs !== outer) {
        busy = true
        try {
          await (document.exitFullscreen ?? document.webkitExitFullscreen?.bind(document))?.()
          await (outer.requestFullscreen ?? outer.webkitRequestFullscreen?.bind(outer))?.()
        } catch { /* ignore permission errors */ }
        busy = false
      }
    }

    document.addEventListener('fullscreenchange', onFSChange)
    document.addEventListener('webkitfullscreenchange', onFSChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFSChange)
      document.removeEventListener('webkitfullscreenchange', onFSChange)
    }
  }, [])

  if (error) {
    return (
      <div className="aspect-video bg-bg-header/60 rounded-xl flex items-center justify-center">
        <p className="text-red-400 text-sm text-center px-4">{error}</p>
      </div>
    )
  }

  return (
    <>
      <style>{`
        .vp-wrap:fullscreen, .vp-wrap:-webkit-full-screen {
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0 !important;
        }
        .vp-wrap:fullscreen .vp-inner,
        .vp-wrap:-webkit-full-screen .vp-inner {
          width: 100%;
        }
      `}</style>
      <div ref={outerRef} className="vp-wrap relative rounded-xl overflow-hidden">
        {!ready && (
          <div className="aspect-video bg-bg-header/60 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-link-hover/30 border-t-link-hover rounded-full animate-spin" />
          </div>
        )}
        <div className="vp-inner">
          <div ref={containerRef} />
        </div>

        {watermark && ready && (
          <div
            className="absolute inset-0 pointer-events-none select-none overflow-hidden"
            aria-hidden="true"
          >
            <span style={wmStyle(5, 3, -15)}>{watermark}</span>
            <span style={wmStyle(78, 58, -15)}>{watermark}</span>
          </div>
        )}
      </div>
    </>
  )
}

function wmStyle(top, left, rotate) {
  return {
    position: 'absolute',
    top: `${top}%`,
    left: `${left}%`,
    transform: `rotate(${rotate}deg)`,
    color: 'white',
    fontSize: '11px',
    fontWeight: '500',
    opacity: 0.12,
    whiteSpace: 'nowrap',
    letterSpacing: '0.05em',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
    userSelect: 'none',
    pointerEvents: 'none',
  }
}

export default VimeoPlayer
