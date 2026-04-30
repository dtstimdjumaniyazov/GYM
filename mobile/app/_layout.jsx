import { useState, useEffect } from 'react'
import { Stack } from 'expo-router'
import { Provider } from 'react-redux'
import { store } from '../src/store'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { initI18n } from '../src/i18n'

export default function RootLayout() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initI18n().then(() => setReady(true))
  }, [])

  if (!ready) return null

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </Provider>
    </SafeAreaProvider>
  )
}
