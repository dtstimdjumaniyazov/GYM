import { useRef, useEffect, useState } from 'react'
import Player from '@vimeo/player'

/**
 * Vimeo Player — обёртка над @vimeo/player SDK.
 *
 * @param {string|number} vimeoId  — ID видео на Vimeo (обязательно)
 * @param {boolean}       autoplay — автовоспроизведение
 * @param {Function}      onEnded  — коллбэк по окончании видео
 * @param {Function}      onTimeUpdate — коллбэк с { seconds, percent, duration }
 */
function VimeoPlayer({ vimeoId, autoplay = false, onEnded, onTimeUpdate }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const onEndedRef = useRef(onEnded)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)

  // Держим refs в синхронизации с пропсами —
  // это позволяет менять коллбэки без пересоздания плеера
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
    </div>
  )
}

export default VimeoPlayer
