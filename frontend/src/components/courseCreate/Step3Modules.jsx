import { useTranslation } from 'react-i18next'
import VideoUploader from './VideoUploader'
import FileUploader from './FileUploader'
import { useDeleteVimeoVideoMutation, useDeleteGDriveFileMutation } from '../../app/api/courseCreateApi'

const MAX_ITEMS = 20

export default function Step3Modules({ selectedModuleTypes, modules, onChange }) {
  const { t } = useTranslation()
  const [deleteVimeoVideo] = useDeleteVimeoVideoMutation()
  const [deleteGDriveFile] = useDeleteGDriveFileMutation()

  const MODULE_LABELS = {
    theory: t('course.module_theory'),
    nutrition: t('course.module_nutrition'),
    recovery: t('course.module_recovery'),
    sports_nutrition: t('course.module_sports_nutrition'),
    training_nuances: t('course.module_training_nuances'),
  }

  const activeTypes = (selectedModuleTypes || []).filter((t) => t !== 'training')

  if (activeTypes.length === 0) {
    return (
      <div className="text-white/40 text-sm text-center py-10 border border-dashed border-white/15 rounded-xl">
        {t('create.no_extra_modules')}<br />
        <span className="text-white/25 text-xs">{t('create.no_extra_modules_hint')}</span>
      </div>
    )
  }

  function getItems(type) {
    return modules[type] || []
  }

  function setItems(type, items) {
    onChange({ ...modules, [type]: items })
  }

  function addVideo(type, vimeoVideoId, title) {
    const items = getItems(type)
    if (items.length >= MAX_ITEMS) return
    setItems(type, [...items, {
      _key: Date.now(),
      type: 'video',
      title,
      vimeo_video_id: vimeoVideoId,
    }])
  }

  function addFile(type, gdriveFileId, filename, mimeType) {
    const items = getItems(type)
    if (items.length >= MAX_ITEMS) return
    setItems(type, [...items, {
      _key: Date.now(),
      type: 'file',
      title: filename,
      gdrive_file_id: gdriveFileId,
      filename,
      mime_type: mimeType,
    }])
  }

  function removeItem(type, idx) {
    const item = getItems(type)[idx]
    if (item?.vimeo_video_id) deleteVimeoVideo(item.vimeo_video_id).catch(() => {})
    if (item?.gdrive_file_id) deleteGDriveFile(item.gdrive_file_id).catch(() => {})
    setItems(type, getItems(type).filter((_, i) => i !== idx))
  }

  function updateTitle(type, idx, title) {
    const items = getItems(type).map((item, i) => (i === idx ? { ...item, title } : item))
    setItems(type, items)
  }

  return (
    <div className="space-y-8">
      <p className="text-white/50 text-sm">
        {t('create.step3_desc')}
      </p>

      {activeTypes.map((type) => {
        const items = getItems(type)
        return (
          <div key={type} className="space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              {MODULE_LABELS[type]}
              <span className="text-xs text-white/30 font-normal">{t('create.items_count', { count: items.length })}</span>
            </h3>

            {/* Existing items */}
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item._key ?? idx} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <span className="text-white/30 text-xs font-mono shrink-0">#{idx + 1}</span>
                  {item.type === 'video' ? (
                    <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  )}
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => updateTitle(type, idx, e.target.value)}
                    placeholder={t('create.item_title_placeholder')}
                    className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(type, idx)}
                    className="text-white/25 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Add buttons */}
            {items.length < MAX_ITEMS && (
              <div className="grid grid-cols-2 gap-3">
                <VideoUploader
                  index={items.filter((i) => i.type === 'video').length + 1}
                  onUploaded={(id, title) => addVideo(type, id, title)}
                />
                <FileUploader
                  index={items.filter((i) => i.type === 'file').length + 1}
                  onUploaded={(id, filename, mime) => addFile(type, id, filename, mime)}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
