import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return headers
  },
})

let refreshingPromise = null

function forceLogout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

async function tryRefresh(api, extraOptions) {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return false

  const result = await rawBaseQuery(
    {
      url: '/users/token/refresh/',
      method: 'POST',
      body: { refresh: refreshToken },
    },
    api,
    extraOptions,
  )

  if (result?.data?.access) {
    localStorage.setItem('access_token', result.data.access)
    return true
  }
  return false
}

export const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions)

  if (result?.error?.status !== 401) return result

  // Only attempt reauth if user was logged in
  if (!localStorage.getItem('access_token')) return result

  // Mutex: if already refreshing, wait for the existing attempt
  if (!refreshingPromise) {
    refreshingPromise = tryRefresh(api, extraOptions)
  }

  const refreshed = await refreshingPromise
  refreshingPromise = null

  if (refreshed) {
    // Retry the original request with the new token
    result = await rawBaseQuery(args, api, extraOptions)
  }

  // If still 401 after refresh attempt — session is truly invalid
  if (result?.error?.status === 401) {
    forceLogout()
  }

  return result
}
