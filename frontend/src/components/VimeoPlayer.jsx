import { useRef, useEffect, useState } from 'react'
import Player from '@vimeo/player'

/**
 * Vimeo Player — обёртка над @vimeo/player SDK.
 *
 * @param {string|number} vimeoId      — ID видео на Vimeo (обязательно)
 * @param {boolean}       autoplay     — автовоспроизведение
 * @param {string}        watermark    — текст водяного знака (телефон/имя пользователя)
 * @param {Function}      onEnded      — коллбэк по окончании видео
 * @param {Function}      onTimeUpdate — коллбэк с { seconds, percent, duration }
 */
function VimeoPlayer({ vimeoId, autoplay = false, watermark, onEnded, onTimeUpdate }) {
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

  if (error) {
    return (
      <div className="aspect-video bg-bg-header/60 rounded-xl flex items-center justify-center">
        <p className="text-red-400 text-sm text-center px-4">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative rounded-xl overflow-hidden">
      {!ready && (
        <div className="aspect-video bg-bg-header/60 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-link-hover/30 border-t-link-hover rounded-full animate-spin" />
        </div>
      )}
      <div ref={containerRef} />

      {/* Watermark overlay — pointer-events:none чтобы не мешать управлению плеером */}
      {watermark && ready && (
        <div
          className="absolute inset-0 pointer-events-none select-none overflow-hidden"
          aria-hidden="true"
        >
          {/* Три экземпляра в разных углах для надёжности */}
          <span style={wmStyle(15, 20, -20)}>{watermark}</span>
          <span style={wmStyle(45, 55, -20)}>{watermark}</span>
          <span style={wmStyle(70, 10, -20)}>{watermark}</span>
        </div>
      )}
    </div>
  )
}

function wmStyle(top, left, rotate) {
  return {
    position: 'absolute',
    top: `${top}%`,
    left: `${left}%`,
    transform: `rotate(${rotate}deg)`,
    color: 'white',
    fontSize: '13px',
    fontWeight: '500',
    opacity: 0.18,
    whiteSpace: 'nowrap',
    letterSpacing: '0.05em',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
    userSelect: 'none',
    pointerEvents: 'none',
  }
}

export default VimeoPlayer
