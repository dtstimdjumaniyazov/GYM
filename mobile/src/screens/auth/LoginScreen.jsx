import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { useDispatch } from 'react-redux'
import { useLoginMutation, useGetMeQuery } from '../../api/authApi'
import { setCredentials } from '../../store/authSlice'
import { baseApi } from '../../api/baseApi'
import { COLORS } from '../../theme'

export default function LoginScreen() {
  const [phone, setPhone] = useState('+998')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [login, { isLoading }] = useLoginMutation()
  const dispatch = useDispatch()

  async function handleLogin() {
    setError('')
    if (!phone.trim() || !password.trim()) {
      setError('Введите номер телефона и пароль')
      return
    }
    try {
      const tokens = await login({ phone: phone.trim(), password }).unwrap()
      await SecureStore.setItemAsync('access_token', tokens.access)
      await SecureStore.setItemAsync('refresh_token', tokens.refresh)
      dispatch(setCredentials({ token: tokens.access, user: null }))
    } catch (err) {
      setError(err?.data?.detail || 'Неверный номер или пароль')
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>FitEvolution</Text>
        <Text style={styles.title}>Вход</Text>

        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+998 XX XXX XX XX"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Пароль"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry
          autoCapitalize="none"
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Войти</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          Для входа используйте те же данные, что и на сайте fitevolution.uz
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  logo: { fontSize: 28, fontWeight: '800', color: COLORS.accent, textAlign: 'center', marginBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 24 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 12,
  },
  error: { color: COLORS.error, fontSize: 13, marginBottom: 12 },
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: 20, lineHeight: 18 },
})
