import { useState, useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

function FileViewerModal({ content, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [zoomed, setZoomed] = useState(false)

  const fileId = content.gdrive_file?.id
  const isImage = content.content_type === 'image'
  const isPdf = content.content_type === 'pdf'

  const handleKeyDown = useCallback(
    (e) => { if (e.key === 'Escape') onClose() },
    [onClose],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  // Fetch the file through our backend proxy using the JWT token
  useEffect(() => {
    if (!fileId) return

    const token = localStorage.getItem('access_token')
    const proxyUrl = `${API_BASE}/storage/gdrive/${fileId}/view/`

    fetch(proxyUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.blob()
      })
      .then((blob) => {
        setBlobUrl(URL.createObjectURL(blob))
        setLoading(false)
      })
      .catch((err) => {
        setError('Не удалось загрузить файл')
        setLoading(false)
        console.error('FileViewerModal fetch error:', err)
      })

    return () => {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [fileId])

  if (!fileId) return null

  return (
    <div
      className="fixed inset-0 bg-black/80 flex flex-col z-50"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-black/60 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-text-header font-medium truncate mr-4">
          {content.title}
        </h3>
        <button
          onClick={onClose}
          className="text-text-primary/70 hover:text-text-header text-2xl leading-none cursor-pointer transition-colors"
        >
          &times;
        </button>
      </div>

      {/* Content */}
      <div
        className="flex-1 flex items-center justify-center overflow-auto p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        {loading && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-link-hover border-t-transparent rounded-full animate-spin" />
            <p className="text-text-primary/60 text-sm">Загрузка файла...</p>
          </div>
        )}

        {error && (
          <div className="text-red-400 text-center">
            <p className="text-lg mb-1">Ошибка загрузки</p>
            <p className="text-sm text-text-primary/60">{error}</p>
          </div>
        )}

        {blobUrl && isPdf && (
          <iframe
            src={blobUrl}
            title={content.title}
            className="w-full h-full max-w-5xl rounded-lg bg-white"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {blobUrl && isImage && (
          <img
            src={blobUrl}
            alt={content.title}
            onClick={(e) => {
              e.stopPropagation()
              setZoomed((z) => !z)
            }}
            className={`transition-all duration-300 rounded-lg ${
              zoomed
                ? 'max-w-none max-h-none cursor-zoom-out'
                : 'max-w-full max-h-full object-contain cursor-zoom-in'
            }`}
          />
        )}
      </div>
    </div>
  )
}

export default FileViewerModal
