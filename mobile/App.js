import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { Provider, useDispatch } from 'react-redux'
import * as SecureStore from 'expo-secure-store'
import { store } from './src/store'
import { setCredentials } from './src/store/authSlice'
import AppNavigator from './src/navigation/AppNavigator'

function AppInner() {
  const dispatch = useDispatch()

  useEffect(() => {
    async function restoreSession() {
      const token = await SecureStore.getItemAsync('access_token')
      if (token) {
        dispatch(setCredentials({ token, user: null }))
      }
    }
    restoreSession()
  }, [])

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <AppInner />
    </Provider>
  )
}
