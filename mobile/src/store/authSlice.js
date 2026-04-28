import { createSlice } from '@reduxjs/toolkit'

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: null,
    user: null,
    isAuthenticated: false,
  },
  reducers: {
    setCredentials(state, action) {
      state.token = action.payload.token
      state.user = action.payload.user
      state.isAuthenticated = true
    },
    setUser(state, action) {
      state.user = action.payload
    },
    logout(state) {
      state.token = null
      state.user = null
      state.isAuthenticated = false
    },
  },
})

export const { setCredentials, setUser, logout } = authSlice.actions
export default authSlice.reducer
