import { useTranslation } from 'react-i18next'
import VideoUploader from './VideoUploader'
import FileUploader from './FileUploader'

const MAX_VIDEOS = 5
const MAX_FILES = 5

export default function DayRow({ day, onChange }) {
  const { t } = useTranslation()

  const DAY_NAMES = {
    1: t('create.day_mon'),
    2: t('create.day_tue'),
    3: t('create.day_wed'),
    4: t('create.day_thu'),
    5: t('create.day_fri'),
    6: t('create.day_sat'),
    7: t('create.day_sun'),
  }

  const videos = day.videos || []
  const files = day.files || []

  function setRestDay(value) {
    onChange({ ...day, is_rest_day: value, videos: [], files: [] })
  }

  function addVideo(vimeoVideoId, title) {
    if (videos.length >= MAX_VIDEOS) return
    onChange({ ...day, videos: [...videos, { vimeo_video_id: vimeoVideoId, title }] })
  }

  function removeVideo(idx) {
    onChange({ ...day, videos: videos.filter((_, i) => i !== idx) })
  }

  function addFile(gdriveFileId, filename, mimeType) {
    if (files.length >= MAX_FILES) return
    onChange({ ...day, files: [...files, { gdrive_file_id: gdriveFileId, filename, mime_type: mimeType }] })
  }

  function removeFile(idx) {
    onChange({ ...day, files: files.filter((_, i) => i !== idx) })
  }

  return (
    <div className="border-b border-white/10 last:border-0">
      <div className="grid grid-cols-[140px_80px_1fr_1fr] gap-3 py-3 items-start">

        {/* Day name */}
        <div className="pt-1">
          <span className="text-sm font-medium text-white">{DAY_NAMES[day.day_of_week]}</span>
        </div>

        {/* Rest day toggle */}
        <div className="flex items-center pt-1">
          <button
            type="button"
            onClick={() => setRestDay(!day.is_rest_day)}
            title={day.is_rest_day ? t('create.rest_tooltip') : t('create.workout_tooltip')}
            className={`relative w-10 h-5 rounded-full overflow-hidden transition-all duration-200 cursor-pointer ${
              day.is_rest_day
                ? 'bg-main ring-1 ring-inset ring-white/20'
                : 'bg-white/10 ring-1 ring-inset ring-white/30'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full shadow-sm transition-all duration-200 ${
                day.is_rest_day
                  ? 'bg-white left-5.5'
                  : 'bg-white/90 left-0.5'
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
                />
              ))}
              {videos.length < MAX_VIDEOS && (
                <VideoUploader
                  index={videos.length + 1}
                  onUploaded={addVideo}
                />
              )}
              {videos.length === 0 && (
                <p className="text-xs text-white/25 italic px-1">{t('create.no_videos')}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-white/25 italic px-1 pt-1">—</p>
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
              {files.length < MAX_FILES && (
                <FileUploader
                  index={files.length + 1}
                  onUploaded={addFile}
                />
              )}
              {files.length === 0 && (
                <p className="text-xs text-white/25 italic px-1">{t('create.no_files')}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-white/25 italic px-1 pt-1">—</p>
          )}
        </div>
      </div>
    </div>
  )
}
