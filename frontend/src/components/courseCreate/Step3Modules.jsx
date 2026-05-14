import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useDeleteVimeoVideoMutation,
  useDeleteGDriveFileMutation,
  useInitVimeoUploadMutation,
  useUpdateVimeoStatusMutation,
  uploadVideoViaTus,
  uploadFileToGDrive,
} from '../../app/api/courseCreateApi'

const MAX_ITEMS = 20
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

export default function Step3Modules({ selectedModuleTypes, modules, onChange }) {
  const { t } = useTranslation()

  const MODULE_LABELS = {
    theory: t('course.module_theory'),
    nutrition: t('course.module_nutrition'),
    recovery: t('course.module_recovery'),
    sports_nutrition: t('course.module_sports_nutrition'),
    training_nuances: t('course.module_training_nuances'),
  }

  const activeTypes = (selectedModuleTypes || []).filter((type) => type !== 'training')

  if (activeTypes.length === 0) {
    return (
      <div className="text-gray-400 text-sm text-center py-10 border border-dashed border-gray-200 rounded-xl">
        {t('create.no_extra_modules')}<br />
        <span className="text-gray-400 text-xs">{t('create.no_extra_modules_hint')}</span>
      </div>
    )
  }

  function getItems(type) { return modules[type] || [] }
  function setItems(type, updater) {
    onChange(prev => ({
      ...prev,
      [type]: typeof updater === 'function' ? updater(prev[type] || []) : updater,
    }))
  }

  return (
    <div className="space-y-8">
      <p className="text-blue-500 text-sm">{t('create.step3_desc')}</p>
      {activeTypes.map((type) => (
        <ModuleSection
          key={type}
          label={MODULE_LABELS[type]}
          items={getItems(type)}
          onItemsChange={(items) => setItems(type, items)}
        />
      ))}
    </div>
  )
}

function ModuleSection({ label, items, onItemsChange }) {
  const { t } = useTranslation()
  const [deleteVimeoVideo] = useDeleteVimeoVideoMutation()
  const [deleteGDriveFile] = useDeleteGDriveFileMutation()
  const [initVimeoUpload] = useInitVimeoUploadMutation()
  const [updateVimeoStatus] = useUpdateVimeoStatusMutation()

  const videoInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const uploadsRef = useRef({})
  const [uploadingVideos, setUploadingVideos] = useState([])
  const [uploadingFiles, setUploadingFiles] = useState([])

  function addVideo(vimeoVideoId, title) {
    onItemsChange(prev => [...prev, { _key: Date.now(), type: 'video', title, vimeo_video_id: vimeoVideoId, is_preview: false }])
  }

  function addFile(gdriveFileId, filename, mimeType) {
    onItemsChange(prev => {
      if (prev.length >= MAX_ITEMS) return prev
      return [...prev, { _key: Date.now(), type: 'file', title: filename, gdrive_file_id: gdriveFileId, filename, mime_type: mimeType }]
    })
  }

  function updateTitle(idx, title) {
    onItemsChange(items.map((item, i) => (i === idx ? { ...item, title } : item)))
  }

  function togglePreview(idx) {
    onItemsChange(items.map((item, i) => (i === idx ? { ...item, is_preview: !item.is_preview } : item)))
  }

  function moveItem(idx, dir) {
    const next = idx + dir
    if (next < 0 || next >= items.length) return
    const reordered = [...items]
    ;[reordered[idx], reordered[next]] = [reordered[next], reordered[idx]]
    onItemsChange(reordered)
  }

  function sortByName() {
    onItemsChange([...items].sort((a, b) => a.title.localeCompare(b.title)))
  }

  async function removeItem(idx) {
    const item = items[idx]
    if (item?.vimeo_video_id) try { await deleteVimeoVideo(item.vimeo_video_id) } catch {}
    if (item?.gdrive_file_id) try { await deleteGDriveFile(item.gdrive_file_id) } catch {}
    onItemsChange(items.filter((_, i) => i !== idx))
  }

  async function handleVideoFiles(e) {
    const selected = Array.from(e.target.files || [])
    e.target.value = ''
    if (!selected.length) return

    const entries = selected.map(f => ({
      uid: crypto.randomUUID(),
      filename: f.name.replace(/\.[^.]+$/, ''),
      progress: 0,
      error: null,
    }))
    setUploadingVideos(prev => [...prev, ...entries])

    selected.forEach(async (file, i) => {
      const { uid, filename } = entries[i]
      uploadsRef.current[uid] = {}
      const upd = patch => setUploadingVideos(prev => prev.map(u => u.uid === uid ? { ...u, ...patch } : u))
      const done = () => { setUploadingVideos(prev => prev.filter(u => u.uid !== uid)); delete uploadsRef.current[uid] }

      try {
        const { vimeo_video_id, upload_url } = await initVimeoUpload({ title: filename, file_size: file.size }).unwrap()
        uploadsRef.current[uid].vimeoId = vimeo_video_id

        await uploadVideoViaTus({
          uploadUrl: upload_url,
          file,
          onProgress: p => upd({ progress: p }),
          onError: err => { throw err },
          onAbort: fn => { uploadsRef.current[uid].abort = fn },
        })

        await updateVimeoStatus({ id: vimeo_video_id, status: 'processing' }).unwrap()
        addVideo(vimeo_video_id, filename)
        done()
      } catch (err) {
        if (err?.name === 'AbortError') { done(); return }
        upd({ error: err?.data?.detail || err?.message || t('create.upload_error_video') })
      }
    })
  }

  async function cancelVideoUpload(uid) {
    const ref = uploadsRef.current[uid] || {}
    ref.abort?.()
    if (ref.vimeoId) try { await deleteVimeoVideo(ref.vimeoId) } catch {}
    delete uploadsRef.current[uid]
    setUploadingVideos(prev => prev.filter(u => u.uid !== uid))
  }

  async function handleFileFiles(e) {
    const selected = Array.from(e.target.files || []).filter(f => ALLOWED_FILE_TYPES.includes(f.type))
    e.target.value = ''
    if (!selected.length) return

    const slots = MAX_ITEMS - items.length - uploadingFiles.length
    const toUpload = selected.slice(0, Math.max(0, slots))
    if (!toUpload.length) return

    const entries = toUpload.map(f => ({
      uid: crypto.randomUUID(),
      filename: f.name,
      progress: 0,
      error: null,
    }))
    setUploadingFiles(prev => [...prev, ...entries])

    toUpload.forEach(async (file, i) => {
      const { uid } = entries[i]
      uploadsRef.current[uid] = {}
      const upd = patch => setUploadingFiles(prev => prev.map(u => u.uid === uid ? { ...u, ...patch } : u))
      const done = () => { setUploadingFiles(prev => prev.filter(u => u.uid !== uid)); delete uploadsRef.current[uid] }

      try {
        const token = localStorage.getItem('access_token')
        const result = await uploadFileToGDrive({
          file,
          onProgress: p => upd({ progress: p }),
          accessToken: token,
          onAbort: fn => { uploadsRef.current[uid].abort = fn },
        })
        addFile(result.id, file.name, file.type)
        done()
      } catch (err) {
        if (err?.name === 'AbortError') { done(); return }
        upd({ error: err?.detail || t('create.upload_error_file') })
      }
    })
  }

  async function cancelFileUpload(uid) {
    const ref = uploadsRef.current[uid] || {}
    ref.abort?.()
    if (ref.gdriveId) try { await deleteGDriveFile(ref.gdriveId) } catch {}
    delete uploadsRef.current[uid]
    setUploadingFiles(prev => prev.filter(u => u.uid !== uid))
  }

  const totalCount = items.length + uploadingVideos.length + uploadingFiles.length

  return (
    <div className="bg-bg-main/5 border border-bg-main/15 rounded-xl p-4 space-y-3">
      <h3 className="text-base font-semibold text-bg-main flex items-center gap-2">
        {label}
        <span className="text-xs text-bg-main/50 font-normal">{t('create.items_count', { count: items.length })}</span>
      </h3>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={item._key ?? idx} className="flex items-center gap-2 bg-white border border-bg-main/20 rounded-lg px-3 py-2">
            <span className="text-gray-400 text-xs font-mono shrink-0">#{idx + 1}</span>

            {/* Move up/down */}
            <div className="flex flex-col shrink-0">
              <button
                type="button"
                onClick={() => moveItem(idx, -1)}
                disabled={idx === 0}
                className="text-gray-300 hover:text-gray-600 disabled:opacity-0 disabled:cursor-default transition-colors leading-none"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveItem(idx, 1)}
                disabled={idx === items.length - 1}
                className="text-gray-300 hover:text-gray-600 disabled:opacity-0 disabled:cursor-default transition-colors leading-none"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {item.type === 'video' ? (
              <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )}
            <input
              type="text"
              value={item.title}
              onChange={(e) => updateTitle(idx, e.target.value)}
              placeholder={t('create.item_title_placeholder')}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
            />
            {item.type === 'video' && (
              <button
                type="button"
                onClick={() => togglePreview(idx)}
                title={t('create.preview_toggle_hint')}
                className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors ${
                  item.is_preview
                    ? 'bg-bg-main/10 text-bg-main border border-bg-main/30'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
                </svg>
                {item.is_preview && <span>{t('create.preview_label')}</span>}
              </button>
            )}
            <button type="button" onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {items.length > 1 && (
          <button
            type="button"
            onClick={sortByName}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors px-1 py-0.5"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Сортировать по названию
          </button>
        )}

        {uploadingVideos.map((u, i) => (
          <UploadProgress
            key={u.uid}
            index={items.length + i + 1}
            filename={u.filename}
            progress={u.progress}
            error={u.error}
            onCancel={() => cancelVideoUpload(u.uid)}
            onDismiss={() => setUploadingVideos(prev => prev.filter(x => x.uid !== u.uid))}
          />
        ))}

        {uploadingFiles.map((u, i) => (
          <UploadProgress
            key={u.uid}
            index={items.length + uploadingVideos.length + i + 1}
            filename={u.filename}
            progress={u.progress}
            error={u.error}
            onCancel={() => cancelFileUpload(u.uid)}
            onDismiss={() => setUploadingFiles(prev => prev.filter(x => x.uid !== u.uid))}
          />
        ))}
      </div>

      {totalCount < MAX_ITEMS && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input ref={videoInputRef} type="file" accept="video/*" multiple className="hidden" onChange={handleVideoFiles} />
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="flex items-center gap-2 w-full border border-dashed border-bg-main/30 bg-bg-main/5 rounded-lg px-3 py-2.5 text-sm text-bg-main/70 hover:border-bg-main hover:bg-bg-main/10 hover:text-bg-main transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('create.select_video')}
            </button>
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept=".pdf,image/jpeg,image/png" multiple className="hidden" onChange={handleFileFiles} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 w-full border border-dashed border-bg-main/30 bg-bg-main/5 rounded-lg px-3 py-2.5 text-sm text-bg-main/70 hover:border-bg-main hover:bg-bg-main/10 hover:text-bg-main transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('create.select_file')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function UploadProgress({ index, filename, progress, error, onCancel, onDismiss }) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-gray-600 truncate">
            <span className="text-gray-400 font-mono mr-1.5">#{index}</span>{filename}
          </p>
          <p className="text-red-600 text-xs mt-0.5">{error}</p>
        </div>
        <button type="button" onClick={onDismiss} className="text-gray-400 hover:text-red-600 transition-colors shrink-0 mt-0.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600 truncate flex-1 mr-2">
          <span className="text-gray-400 font-mono mr-1.5">#{index}</span>{filename}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-bg-main font-mono">{progress}%</span>
          {progress < 100 && (
            <button type="button" onClick={onCancel} className="text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-bg-main transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
