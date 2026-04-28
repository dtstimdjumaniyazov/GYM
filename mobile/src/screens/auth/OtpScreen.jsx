import { useState, useRef, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { useDispatch } from 'react-redux'
import { useVerifyOtpMutation } from '../../api/authApi'
import { setCredentials } from '../../store/authSlice'
import { COLORS } from '../../theme'

export default function OtpScreen({ route }) {
  const { phone } = route.params
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [verifyOtp, { isLoading }] = useVerifyOtpMutation()
  const dispatch = useDispatch()
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleVerify() {
    setError('')
    if (code.length < 4) {
      setError('Введите код из SMS')
      return
    }
    try {
      const result = await verifyOtp({ phone, code }).unwrap()
      await SecureStore.setItemAsync('access_token', result.access)
      await SecureStore.setItemAsync('refresh_token', result.refresh)
      dispatch(setCredentials({ token: result.access, user: result.user }))
    } catch (err) {
      setError(err?.data?.detail || 'Неверный код. Попробуйте снова.')
      setCode('')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Код подтверждения</Text>
        <Text style={styles.subtitle}>Отправили SMS на номер {phone}</Text>

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={code}
          onChangeText={(v) => { setCode(v); if (v.length === 6) handleVerify() }}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="------"
          placeholderTextColor={COLORS.textMuted}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Войти</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 28 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 28,
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: 12,
    textAlign: 'center',
  },
  error: { color: '#f87171', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
