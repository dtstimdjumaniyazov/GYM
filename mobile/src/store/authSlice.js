import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { Linking } from 'react-native'
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import api from '../services/api'
import { storage } from '../services/storage'
import { ENDPOINTS } from '../constants/api'

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
})

export const login = createAsyncThunk('auth/login', async ({ phone, password }, { rejectWithValue }) => {
  try {
    const { data } = await api.post(ENDPOINTS.TOKEN, { phone, password })
    await storage.setTokens(data.access, data.refresh)
    return data
  } catch (e) {
    return rejectWithValue(e.response?.data || { detail: 'Ошибка входа' })
  }
})

export const register = createAsyncThunk('auth/register', async (formData, { rejectWithValue }) => {
  try {
    const { data } = await api.post(ENDPOINTS.REGISTER, formData)
    await storage.setTokens(data.access, data.refresh)
    return data
  } catch (e) {
    return rejectWithValue(e.response?.data || { detail: 'Ошибка регистрации' })
  }
})

export const googleLogin = createAsyncThunk('auth/googleLogin', async (_, { rejectWithValue }) => {
  try {
    await GoogleSignin.hasPlayServices()
    const response = await GoogleSignin.signIn()
    const idToken = response.data?.idToken
    if (!idToken) throw new Error('No ID token')

    const { data } = await api.post(ENDPOINTS.GOOGLE_AUTH, { credential: idToken })

    if (data.status === 'pending_link') {
      return rejectWithValue({
        pending_link: true,
        social_token: data.social_token,
        social_name: data.social_name,
      })
    }

    await storage.setTokens(data.access, data.refresh)
    return data
  } catch (e) {
    if (e?.code === 'SIGN_IN_CANCELLED') return rejectWithValue(null)
    return rejectWithValue(e.response?.data || { detail: 'Ошибка входа через Google' })
  }
})

const MAX_POLL_ATTEMPTS = 45  // 45 × 2s = 90 seconds

async function pollTelegramAuth(state) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const { data } = await api.get(ENDPOINTS.TELEGRAM_MOBILE_POLL(state))
    if (data.status === 'expired') {
      throw new Error('expired')
    }
    if (data.status !== 'pending') {
      return data
    }
  }
  throw new Error('timeout')
}

export const telegramLogin = createAsyncThunk('auth/telegramLogin', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.post(ENDPOINTS.TELEGRAM_MOBILE_INIT)
    const { state, bot_url } = data

    await Linking.openURL(bot_url)

    const result = await pollTelegramAuth(state)

    if (result.status === 'pending_link') {
      return rejectWithValue({
        pending_link: true,
        social_token: result.social_token,
        social_name: result.social_name,
      })
    }

    await storage.setTokens(result.access, result.refresh)
    return result
  } catch (e) {
    if (e?.message === 'cancelled') return rejectWithValue(null)
    if (e?.message === 'expired' || e?.message === 'timeout') {
      return rejectWithValue({ detail: 'telegram_timeout' })
    }
    return rejectWithValue(e.response?.data || { detail: 'Ошибка входа через Telegram' })
  }
})

export const socialLink = createAsyncThunk('auth/socialLink', async ({ socialToken, phone, password }, { rejectWithValue }) => {
  try {
    const { data } = await api.post(ENDPOINTS.SOCIAL_LINK, { social_token: socialToken, phone, password })
    await storage.setTokens(data.access, data.refresh)
    return data
  } catch (e) {
    return rejectWithValue(e.response?.data || { detail: 'Ошибка привязки аккаунта' })
  }
})

export const socialRegister = createAsyncThunk('auth/socialRegister', async ({ socialToken, phone, password, firstName, lastName }, { rejectWithValue }) => {
  try {
    const { data } = await api.post(ENDPOINTS.SOCIAL_REGISTER, {
      social_token: socialToken,
      phone,
      password,
      first_name: firstName,
      last_name: lastName,
    })
    await storage.setTokens(data.access, data.refresh)
    return data
  } catch (e) {
    return rejectWithValue(e.response?.data || { detail: 'Ошибка регистрации' })
  }
})

export const loadProfile = createAsyncThunk('auth/loadProfile', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get(ENDPOINTS.PROFILE)
    return data
  } catch (e) {
    return rejectWithValue(e.response?.data)
  }
})

export const logout = createAsyncThunk('auth/logout', async () => {
  await storage.clearTokens()
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.isLoading = true; state.error = null })
      .addCase(login.fulfilled, (state) => { state.isLoading = false; state.isAuthenticated = true })
      .addCase(login.rejected, (state, action) => { state.isLoading = false; state.error = action.payload })

      .addCase(register.pending, (state) => { state.isLoading = true; state.error = null })
      .addCase(register.fulfilled, (state) => { state.isLoading = false; state.isAuthenticated = true })
      .addCase(register.rejected, (state, action) => { state.isLoading = false; state.error = action.payload })

      .addCase(googleLogin.pending, (state) => { state.isLoading = true; state.error = null })
      .addCase(googleLogin.fulfilled, (state) => { state.isLoading = false; state.isAuthenticated = true })
      .addCase(googleLogin.rejected, (state, action) => { state.isLoading = false; state.error = action.payload })

      .addCase(telegramLogin.pending, (state) => { state.isLoading = true; state.error = null })
      .addCase(telegramLogin.fulfilled, (state) => { state.isLoading = false; state.isAuthenticated = true })
      .addCase(telegramLogin.rejected, (state, action) => { state.isLoading = false; state.error = action.payload })

      .addCase(socialLink.pending, (state) => { state.isLoading = true; state.error = null })
      .addCase(socialLink.fulfilled, (state) => { state.isLoading = false; state.isAuthenticated = true })
      .addCase(socialLink.rejected, (state, action) => { state.isLoading = false; state.error = action.payload })

      .addCase(socialRegister.pending, (state) => { state.isLoading = true; state.error = null })
      .addCase(socialRegister.fulfilled, (state) => { state.isLoading = false; state.isAuthenticated = true })
      .addCase(socialRegister.rejected, (state, action) => { state.isLoading = false; state.error = action.payload })

      .addCase(loadProfile.fulfilled, (state, action) => { state.user = action.payload; state.isAuthenticated = true })
      .addCase(loadProfile.rejected, (state) => { state.isAuthenticated = false; state.user = null })

      .addCase(logout.fulfilled, (state) => { state.user = null; state.isAuthenticated = false })
  },
})

export const { clearError } = authSlice.actions
export default authSlice.reducer
