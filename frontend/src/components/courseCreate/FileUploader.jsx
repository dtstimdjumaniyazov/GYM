const MIME_ICONS = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
}

export default function FileUploader({ uploadedFile, onRemove, index }) {
  if (!uploadedFile) return null

  return (
    <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-lg px-3 py-2">
      <span className="text-white/40 text-xs font-mono shrink-0">#{index}</span>
      <span className="shrink-0 text-sm">{MIME_ICONS[uploadedFile.mime_type] || '📎'}</span>
      <span className="text-white text-sm truncate flex-1">{uploadedFile.filename}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-white/30 hover:text-red-400 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
