import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../services/api'
import { storage } from '../services/storage'
import { ENDPOINTS } from '../constants/api'

export const login = createAsyncThunk('auth/login', async ({ phone, password }, { rejectWithValue }) => {
  try {
    const { data } = await api.post(ENDPOINTS.TOKEN, { phone, password })
    await storage.setTokens(data.access, data.refresh)
    return data
  } catch (e) {
    return rejectWithValue(e.response?.data || { detail: 'Ошибка входа' })
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

      .addCase(loadProfile.fulfilled, (state, action) => { state.user = action.payload; state.isAuthenticated = true })
      .addCase(loadProfile.rejected, (state) => { state.isAuthenticated = false; state.user = null })

      .addCase(logout.fulfilled, (state) => { state.user = null; state.isAuthenticated = false })
  },
})

export const { clearError } = authSlice.actions
export default authSlice.reducer
