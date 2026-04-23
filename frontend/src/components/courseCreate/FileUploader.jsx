import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { uploadFileToGDrive } from '../../app/api/courseCreateApi'

const MIME_ICONS = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
}

export default function FileUploader({ onUploaded, onRemove, uploadedFile, disabled, index }) {
  const { t } = useTranslation()
  const inputRef = useRef(null)
  const [state, setState] = useState('idle') // idle | uploading | done | error
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!uploadedFile) setState('idle')
  }, [uploadedFile])

  if (uploadedFile) {
    return (
      <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-lg px-3 py-2">
        <span className="text-white/40 text-xs font-mono shrink-0">#{index}</span>
        <span className="shrink-0 text-sm">{MIME_ICONS[uploadedFile.mime_type] || '📎'}</span>
        <span className="text-white text-sm truncate flex-1">{uploadedFile.filename}</span>
        {!disabled && (
          <button type="button" onClick={onRemove} className="text-white/30 hover:text-red-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const allowed = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowed.includes(file.type)) {
      setError(t('create.file_type_error'))
      setState('error')
      return
    }

    setError('')
    setState('uploading')
    setProgress(0)

    try {
      const token = localStorage.getItem('access_token')
      const result = await uploadFileToGDrive({
        file,
        onProgress: setProgress,
        accessToken: token,
      })

      onUploaded(result.id, file.name, file.type, result)
      setState('idle')
    } catch (err) {
      console.error('File upload error:', err)
      const detail = err?.detail || (typeof err === 'string' ? err : t('create.upload_error_file'))
      setError(detail)
      setState('error')
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || state === 'uploading'}
      />

      {state === 'idle' && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex items-center gap-2 w-full border border-dashed border-white/25 rounded-lg px-3 py-2 text-sm text-white/50 hover:border-main hover:text-white/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="text-white/30 text-xs font-mono shrink-0">#{index}</span>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('create.select_file')}
        </button>
      )}

      {state === 'uploading' && (
        <div className="bg-white/5 border border-white/15 rounded-lg px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/60">{t('create.uploading_gdrive')}</span>
            <span className="text-xs text-main font-mono">{progress}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-main transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          <p className="text-red-400 text-xs mb-1">{error}</p>
          <button
            type="button"
            onClick={() => setState('idle')}
            className="text-xs text-red-300 hover:text-white underline"
          >
            {t('create.retry')}
          </button>
        </div>
      )}
    </div>
  )
}
