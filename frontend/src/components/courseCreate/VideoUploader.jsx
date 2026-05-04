import { useTranslation } from 'react-i18next'

export default function VideoUploader({ uploadedVideo, onRemove, onTitleChange, index }) {
  const { t } = useTranslation()
  if (!uploadedVideo) return null

  return (
    <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-lg px-3 py-2">
      <span className="text-white/40 text-xs font-mono shrink-0">#{index}</span>
      <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
      </svg>
      {onTitleChange ? (
        <input
          type="text"
          value={uploadedVideo.title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder={t('create.video_title_placeholder')}
          className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none min-w-0"
        />
      ) : (
        <span className="text-white text-sm truncate flex-1">{uploadedVideo.title}</span>
      )}
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-white/30 hover:text-red-400 transition-colors ml-1 shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
