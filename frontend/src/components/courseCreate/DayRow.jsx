import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import VideoUploader from './VideoUploader'
import FileUploader from './FileUploader'
import {
  useDeleteGDriveFileMutation,
  useDeleteVimeoVideoMutation,
  useInitVimeoUploadMutation,
  useUpdateVimeoStatusMutation,
  uploadVideoViaTus,
  uploadFileToGDrive,
} from '../../app/api/courseCreateApi'

const MAX_FILES = 5
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

export default function DayRow({ day, onChange, week1Videos }) {
  const { t } = useTranslation()
  const [deleteGDriveFile] = useDeleteGDriveFileMutation()
  const [deleteVimeoVideo] = useDeleteVimeoVideoMutation()
  const [initVimeoUpload] = useInitVimeoUploadMutation()
  const [updateVimeoStatus] = useUpdateVimeoStatusMutation()

  const videoInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const uploadsRef = useRef({})

  const [uploadingVideos, setUploadingVideos] = useState([])
  const [uploadingFiles, setUploadingFiles] = useState([])

  const DAY_NAMES = {
    1: t('create.day_mon'), 2: t('create.day_tue'), 3: t('create.day_wed'),
    4: t('create.day_thu'), 5: t('create.day_fri'), 6: t('create.day_sat'), 7: t('create.day_sun'),
  }

  const videos = day.videos || []
  const files = day.files || []

  function setRestDay(value) {
    onChange({ ...day, is_rest_day: value, videos: [], files: [] })
  }

  function addVideo(vimeoVideoId, title) {
    onChange(d => ({ ...d, videos: [...(d.videos || []), { vimeo_video_id: vimeoVideoId, title }] }))
  }

  function updateVideoTitle(idx, title) {
    onChange({ ...day, videos: videos.map((v, i) => i === idx ? { ...v, title } : v) })
  }

  function moveVideo(idx, dir) {
    const next = idx + dir
    if (next < 0 || next >= videos.length) return
    const reordered = [...videos]
    ;[reordered[idx], reordered[next]] = [reordered[next], reordered[idx]]
    onChange({ ...day, videos: reordered })
  }

  function sortVideosByName() {
    const sorted = [...videos].sort((a, b) => a.title.localeCompare(b.title))
    onChange({ ...day, videos: sorted })
  }

  async function removeVideo(idx) {
    const video = videos[idx]
    if (video?.vimeo_video_id) {
      try { await deleteVimeoVideo(video.vimeo_video_id) } catch {}
    }
    onChange({ ...day, videos: videos.filter((_, i) => i !== idx) })
  }

  function addFile(gdriveFileId, filename, mimeType) {
    onChange(d => {
      if ((d.files || []).length >= MAX_FILES) return d
      return { ...d, files: [...(d.files || []), { gdrive_file_id: gdriveFileId, filename, mime_type: mimeType }] }
    })
  }

  async function removeFile(idx) {
    const file = files[idx]
    if (file?.gdrive_file_id) {
      try { await deleteGDriveFile(file.gdrive_file_id) } catch {}
    }
    onChange({ ...day, files: files.filter((_, i) => i !== idx) })
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

    const slots = MAX_FILES - (day.files || []).length - uploadingFiles.length
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

  const totalFiles = files.length + uploadingFiles.length

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="grid grid-cols-[140px_80px_1fr_1fr] gap-3 py-3 items-start">

        {/* Day name */}
        <div className="pt-1">
          <span className="text-sm font-medium text-gray-800">{DAY_NAMES[day.day_of_week]}</span>
        </div>

        {/* Rest day toggle */}
        <div className="flex items-center pt-1">
          <button
            type="button"
            onClick={() => setRestDay(!day.is_rest_day)}
            title={day.is_rest_day ? t('create.rest_tooltip') : t('create.workout_tooltip')}
            className={`relative w-10 h-5 rounded-full overflow-hidden transition-all duration-200 cursor-pointer ${
              day.is_rest_day
                ? 'bg-bg-main ring-1 ring-inset ring-white/20'
                : 'bg-gray-200 ring-1 ring-inset ring-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full shadow-sm transition-all duration-200 ${
                day.is_rest_day ? 'bg-white left-5.5' : 'bg-gray-400 left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Videos column */}
        <div className="space-y-1.5">
          {!day.is_rest_day ? (
            <>
              {videos.map((v, i) => (
                <VideoUploader
                  key={i}
                  index={i + 1}
                  uploadedVideo={v}
                  onRemove={() => removeVideo(i)}
                  onTitleChange={title => updateVideoTitle(i, title)}
                  onMoveUp={i > 0 ? () => moveVideo(i, -1) : null}
                  onMoveDown={i < videos.length - 1 ? () => moveVideo(i, 1) : null}
                />
              ))}

              {videos.length > 1 && (
                <button
                  type="button"
                  onClick={sortVideosByName}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors px-1 py-0.5"
                  title="Сортировать по названию"
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
                  index={videos.length + i + 1}
                  filename={u.filename}
                  progress={u.progress}
                  error={u.error}
                  onCancel={() => cancelVideoUpload(u.uid)}
                  onDismiss={() => setUploadingVideos(prev => prev.filter(x => x.uid !== u.uid))}
                />
              ))}

              <input ref={videoInputRef} type="file" accept="video/*" multiple className="hidden" onChange={handleVideoFiles} />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-2 w-full border border-dashed border-bg-main/30 bg-bg-main/5 rounded-lg px-3 py-2 text-sm text-bg-main/70 hover:border-bg-main hover:bg-bg-main/10 hover:text-bg-main transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('create.select_video')}
              </button>

              {week1Videos?.length > 0 && videos.length === 0 && uploadingVideos.length === 0 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...day, videos: [...week1Videos] })}
                  className="flex items-center gap-1.5 text-xs text-bg-main hover:text-bg-main/70 transition-colors px-1 py-0.5"
                  title={t('create.copy_week1_tooltip')}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {t('create.copy_week1')}
                </button>
              )}

              {videos.length === 0 && uploadingVideos.length === 0 && (
                <p className="text-xs text-gray-400 italic px-1">{t('create.no_videos')}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400 italic px-1 pt-1">—</p>
          )}
        </div>

        {/* Files column */}
        <div className="space-y-1.5">
          {!day.is_rest_day ? (
            <>
              {files.map((f, i) => (
                <FileUploader
                  key={i}
                  index={i + 1}
                  uploadedFile={f}
                  onRemove={() => removeFile(i)}
                />
              ))}

              {uploadingFiles.map((u, i) => (
                <UploadProgress
                  key={u.uid}
                  index={files.length + i + 1}
                  filename={u.filename}
                  progress={u.progress}
                  error={u.error}
                  onCancel={() => cancelFileUpload(u.uid)}
                  onDismiss={() => setUploadingFiles(prev => prev.filter(x => x.uid !== u.uid))}
                />
              ))}

              {totalFiles < MAX_FILES && (
                <>
                  <input ref={fileInputRef} type="file" accept=".pdf,image/jpeg,image/png" multiple className="hidden" onChange={handleFileFiles} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 w-full border border-dashed border-bg-main/30 bg-bg-main/5 rounded-lg px-3 py-2 text-sm text-bg-main/70 hover:border-bg-main hover:bg-bg-main/10 hover:text-bg-main transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t('create.select_file')}
                  </button>
                </>
              )}

              {files.length === 0 && uploadingFiles.length === 0 && (
                <p className="text-xs text-gray-400 italic px-1">{t('create.no_files')}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400 italic px-1 pt-1">—</p>
          )}
        </div>
      </div>
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
