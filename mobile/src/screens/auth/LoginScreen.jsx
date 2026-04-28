import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { makeRedirectUri } from 'expo-auth-session'
import { useDispatch } from 'react-redux'
import { Ionicons } from '@expo/vector-icons'
import {
  useLoginMutation,
  useGoogleAuthMutation,
  useTelegramWidgetAuthMutation,
} from '../../api/authApi'
import { setCredentials } from '../../store/authSlice'
import { COLORS } from '../../theme'
import TelegramWebView from './TelegramWebView'

WebBrowser.maybeCompleteAuthSession()

const GOOGLE_WEB_CLIENT_ID = '1087649694615-j3305thk2dkj2o0kfkof1fhgnukhnaoe.apps.googleusercontent.com'

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch()
  const [phone, setPhone] = useState('+998')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [socialLoading, setSocialLoading] = useState(false)
  const [showTelegram, setShowTelegram] = useState(false)

  const [login, { isLoading }] = useLoginMutation()
  const [googleAuth] = useGoogleAuthMutation()
  const [telegramWidgetAuth] = useTelegramWidgetAuthMutation()

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri: makeRedirectUri({ useProxy: true }),
  })

  useEffect(() => {
    if (response?.type === 'success') {
      const accessToken = response.authentication?.accessToken
      if (accessToken) handleGoogleAuth(accessToken)
    } else if (response?.type === 'error') {
      setError('Ошибка авторизации через Google')
    }
  }, [response])

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

  async function handleGoogleAuth(accessToken) {
    setError('')
    setSocialLoading(true)
    try {
      const result = await googleAuth({ access_token: accessToken }).unwrap()
      await handleSocialResult(result)
    } catch (err) {
      setError(err?.data?.detail || 'Ошибка авторизации через Google')
    } finally {
      setSocialLoading(false)
    }
  }

  async function handleTelegramAuth(data) {
    setShowTelegram(false)
    setError('')
    setSocialLoading(true)
    try {
      const result = await telegramWidgetAuth(data).unwrap()
      await handleSocialResult(result)
    } catch (err) {
      setError(err?.data?.detail || 'Ошибка авторизации через Telegram')
    } finally {
      setSocialLoading(false)
    }
  }

  async function handleSocialResult(result) {
    if (result.status === 'authenticated') {
      await SecureStore.setItemAsync('access_token', result.access)
      await SecureStore.setItemAsync('refresh_token', result.refresh)
      dispatch(setCredentials({ token: result.access, user: result.user }))
    } else if (result.status === 'pending_link') {
      navigation.navigate('SocialLink', {
        social_token: result.social_token,
        provider: result.provider,
        social_name: result.social_name || '',
        social_email: result.social_email || '',
      })
    }
  }

  const busy = isLoading || socialLoading

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

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={busy}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Войти</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>или</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social buttons */}
        <TouchableOpacity
          style={styles.socialBtn}
          onPress={() => { setError(''); promptAsync({ useProxy: true }) }}
          disabled={busy || !request}
        >
          {socialLoading ? (
            <ActivityIndicator color={COLORS.text} size="small" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#EA4335" />
              <Text style={styles.socialBtnText}>Войти через Google</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialBtn}
          onPress={() => { setError(''); setShowTelegram(true) }}
          disabled={busy}
        >
          <Ionicons name="paper-plane-outline" size={20} color="#2AABEE" />
          <Text style={styles.socialBtnText}>Войти через Telegram</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Для входа используйте те же данные, что и на сайте fitevolution.uz
        </Text>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
          <Text style={styles.registerLinkText}>
            Нет аккаунта? <Text style={styles.registerLinkAccent}>Зарегистрироваться</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <TelegramWebView
        visible={showTelegram}
        onAuth={handleTelegramAuth}
        onClose={() => setShowTelegram(false)}
      />
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
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: 13 },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 10,
  },
  socialBtnText: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
  hint: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  registerLink: { marginTop: 20, alignItems: 'center' },
  registerLinkText: { color: COLORS.textMuted, fontSize: 14 },
  registerLinkAccent: { color: COLORS.accent, fontWeight: '600' },
})
