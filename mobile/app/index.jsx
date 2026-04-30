import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { View, ActivityIndicator } from 'react-native'
import { loadProfile } from '../src/store/authSlice'
import { storage } from '../src/services/storage'
import { COLORS } from '../src/constants/colors'

export default function Index() {
  const router = useRouter()
  const dispatch = useDispatch()
  const { isAuthenticated } = useSelector((state) => state.auth)

  useEffect(() => {
    const bootstrap = async () => {
      const token = await storage.getAccessToken()
      if (token) {
        await dispatch(loadProfile())
        router.replace('/(tabs)')
      } else {
        router.replace('/auth/login')
      }
    }
    bootstrap()
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.header }}>
      <ActivityIndicator size="large" color={COLORS.white} />
    </View>
  )
}
