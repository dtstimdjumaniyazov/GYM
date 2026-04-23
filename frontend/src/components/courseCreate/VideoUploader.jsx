import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useInitVimeoUploadMutation, useUpdateVimeoStatusMutation, uploadVideoViaTus } from '../../app/api/courseCreateApi'

export default function VideoUploader({ onUploaded, onRemove, uploadedVideo, disabled, index }) {
  const { t } = useTranslation()
  const inputRef = useRef(null)
  const [state, setState] = useState('idle') // idle | uploading | done | error
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const [initVimeoUpload] = useInitVimeoUploadMutation()
  const [updateVimeoStatus] = useUpdateVimeoStatusMutation()

  useEffect(() => {
    if (!uploadedVideo) setState('idle')
  }, [uploadedVideo])

  if (uploadedVideo) {
    return (
      <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-lg px-3 py-2">
        <span className="text-white/40 text-xs font-mono shrink-0">#{index}</span>
        <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
        </svg>
        <span className="text-white text-sm truncate flex-1">{uploadedVideo.title}</span>
        {!disabled && (
          <button type="button" onClick={onRemove} className="text-white/30 hover:text-red-400 transition-colors ml-1">
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

    setError('')
    setState('uploading')
    setProgress(0)

    try {
      const initResult = await initVimeoUpload({
        title: file.name.replace(/\.[^.]+$/, ''),
        file_size: file.size,
      }).unwrap()

      const { vimeo_video_id, upload_url } = initResult

      await uploadVideoViaTus({
        uploadUrl: upload_url,
        file,
        onProgress: setProgress,
        onError: (err) => { throw err },
      })

      await updateVimeoStatus({
        id: vimeo_video_id,
        status: 'processing',
      }).unwrap()

      onUploaded(vimeo_video_id, file.name.replace(/\.[^.]+$/, ''))
      setState('idle')
    } catch (err) {
      console.error('Video upload error:', err)
      setError(err?.data?.detail || err?.message || t('create.upload_error_video'))
      setState('error')
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
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
          {t('create.select_video')}
        </button>
      )}

      {state === 'uploading' && (
        <div className="bg-white/5 border border-white/15 rounded-lg px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/60">{t('create.uploading_vimeo')}</span>
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
