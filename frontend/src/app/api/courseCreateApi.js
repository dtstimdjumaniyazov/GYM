import { apiSlice } from './apiSlice'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const courseCreateApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    // ── Categories ────────────────────────────────────────────

    // GET /api/courses/categories/ — list active categories
    getCategories: builder.query({
      query: () => '/courses/categories/',
      providesTags: ['Category'],
    }),

    // ── Course CRUD ────────────────────────────────────────────

    // POST /api/courses/trainer/ — create draft course
    createCourse: builder.mutation({
      query: (body) => ({
        url: '/courses/trainer/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Course'],
    }),

    // GET /api/courses/trainer/:id/ — get course for trainer
    getTrainerCourse: builder.query({
      query: (id) => `/courses/trainer/${id}/`,
      providesTags: (result, error, id) => [{ type: 'Course', id }],
    }),

    // PATCH /api/courses/trainer/:id/ — update course
    updateCourse: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/courses/trainer/${id}/`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Course', id }],
    }),

    // POST /api/courses/trainer/:id/publish/ — publish/unpublish
    publishCourse: builder.mutation({
      query: ({ id, action }) => ({
        url: `/courses/trainer/${id}/publish/`,
        method: 'POST',
        body: { action },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Course', id }, 'Course'],
    }),

    // GET /api/courses/trainer/my/ — trainer's course list
    getTrainerCourses: builder.query({
      query: () => '/courses/trainer/my/',
      providesTags: ['Course'],
    }),

    // ── Vimeo upload ──────────────────────────────────────────

    // POST /api/storage/vimeo/init/ — init TUS upload, get upload_url
    initVimeoUpload: builder.mutation({
      query: (body) => ({
        url: '/storage/vimeo/init/',
        method: 'POST',
        body,
      }),
    }),

    // PATCH /api/storage/vimeo/:id/status/ — mark upload complete
    updateVimeoStatus: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/storage/vimeo/${id}/status/`,
        method: 'PATCH',
        body,
      }),
    }),

    // ── Google Drive upload ───────────────────────────────────

    // POST /api/storage/gdrive/upload/ — upload PDF/JPEG file
    uploadGDriveFile: builder.mutation({
      queryFn: async ({ file }, _queryApi, _extraOptions, baseQuery) => {
        const formData = new FormData()
        formData.append('file', file)
        return baseQuery({
          url: '/storage/gdrive/upload/',
          method: 'POST',
          body: formData,
        })
      },
    }),

    // ── Training variants ─────────────────────────────────────

    // POST /api/training/variants/ — create variant with full nested data
    saveTrainingVariant: builder.mutation({
      query: (body) => ({
        url: '/training/variants/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TrainingVariant'],
    }),

    // PUT /api/training/variants/:id/ — replace variant
    updateTrainingVariant: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/training/variants/${id}/`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['TrainingVariant'],
    }),

    // DELETE /api/training/variants/:id/
    deleteTrainingVariant: builder.mutation({
      query: (id) => ({
        url: `/training/variants/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TrainingVariant'],
    }),
  }),
})

// ── Raw Vimeo TUS upload (uses tus-js-client directly) ────────
// Called outside RTK Query because tus-js-client needs full control over the request

export async function uploadVideoViaTus({ uploadUrl, file, onProgress, onError, onSuccess }) {
  const { Upload } = await import('tus-js-client')

  return new Promise((resolve, reject) => {
    const upload = new Upload(file, {
      uploadUrl,
      // Vimeo TUS requires these exact headers
      headers: {
        Accept: 'application/vnd.vimeo.*+json;version=3.4',
      },
      chunkSize: 128 * 1024 * 1024, // 128 MB chunks
      retryDelays: [0, 3000, 5000, 10000],
      metadata: {
        filename: file.name,
        filetype: file.type,
      },
      onProgress(bytesUploaded, bytesTotal) {
        const percent = Math.round((bytesUploaded / bytesTotal) * 100)
        onProgress?.(percent)
      },
      onError(error) {
        onError?.(error)
        reject(error)
      },
      onSuccess() {
        onSuccess?.()
        resolve()
      },
    })
    upload.start()
  })
}

// ── Raw GDrive upload (with progress via XMLHttpRequest) ───────
export function uploadFileToGDrive({ file, onProgress, accessToken }) {
  const API_URL = API_BASE
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}/storage/gdrive/upload/`)
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(JSON.parse(xhr.responseText))
      }
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(formData)
  })
}

export const {
  useGetCategoriesQuery,
  useCreateCourseMutation,
  useGetTrainerCourseQuery,
  useUpdateCourseMutation,
  usePublishCourseMutation,
  useGetTrainerCoursesQuery,
  useInitVimeoUploadMutation,
  useUpdateVimeoStatusMutation,
  useUploadGDriveFileMutation,
  useSaveTrainingVariantMutation,
  useUpdateTrainingVariantMutation,
  useDeleteTrainingVariantMutation,
} = courseCreateApi
