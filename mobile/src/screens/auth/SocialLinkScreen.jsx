import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { useDispatch } from 'react-redux'
import { Ionicons } from '@expo/vector-icons'
import { useLinkAccountMutation, useSocialRegisterMutation } from '../../api/authApi'
import { setCredentials } from '../../store/authSlice'
import { COLORS } from '../../theme'

const PROVIDER_LABELS = { google: 'Google', telegram: 'Telegram' }

export default function SocialLinkScreen({ navigation, route }) {
  const { social_token, provider, social_name, social_email } = route.params
  const dispatch = useDispatch()

  const [linkAccount] = useLinkAccountMutation()
  const [socialRegister] = useSocialRegisterMutation()

  const [mode, setMode] = useState('link')
  const [form, setForm] = useState({
    phone: '+998',
    password: '',
    confirmPassword: '',
    first_name: social_name || '',
    last_name: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  function field(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    setError('')

    if (!form.phone.trim() || !form.password) {
      setError('Заполните все обязательные поля')
      return
    }
    if (mode === 'register') {
      if (form.password !== form.confirmPassword) {
        setError('Пароли не совпадают')
        return
      }
      if (form.password.length < 6) {
        setError('Пароль должен содержать минимум 6 символов')
        return
      }
    }

    setIsLoading(true)
    try {
      let result
      if (mode === 'link') {
        result = await linkAccount({
          social_token,
          phone: form.phone.trim(),
          password: form.password,
        }).unwrap()
      } else {
        result = await socialRegister({
          social_token,
          phone: form.phone.trim(),
          password: form.password,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          role: 'student',
        }).unwrap()
      }

      await SecureStore.setItemAsync('access_token', result.access)
      await SecureStore.setItemAsync('refresh_token', result.refresh)
      dispatch(setCredentials({ token: result.access, user: result.user }))
    } catch (err) {
      setError(
        err?.data?.detail ||
        err?.data?.phone?.[0] ||
        err?.data?.password?.[0] ||
        'Ошибка. Попробуйте снова.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const providerLabel = PROVIDER_LABELS[provider] || provider

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.title}>Аккаунт не найден</Text>
        <Text style={styles.subtitle}>
          Вы вошли через {providerLabel}{social_name ? ` как ${social_name}` : ''}.
          {'\n'}Привяжите к существующему аккаунту или создайте новый.
        </Text>

        {/* Mode tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, mode === 'link' && styles.tabActive]}
            onPress={() => { setMode('link'); setError('') }}
          >
            <Text style={[styles.tabText, mode === 'link' && styles.tabTextActive]}>
              Есть аккаунт
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'register' && styles.tabActive]}
            onPress={() => { setMode('register'); setError('') }}
          >
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
              Новый аккаунт
            </Text>
          </TouchableOpacity>
        </View>

        {/* Register-only: name fields */}
        {mode === 'register' && (
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={form.first_name}
              onChangeText={(v) => field('first_name', v)}
              placeholder="Имя"
              placeholderTextColor={COLORS.textMuted}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={form.last_name}
              onChangeText={(v) => field('last_name', v)}
              placeholder="Фамилия"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        )}

        <Text style={styles.label}>Номер телефона <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={form.phone}
          onChangeText={(v) => field('phone', v)}
          keyboardType="phone-pad"
          placeholder="+998 90 123 45 67"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
        />

        <Text style={styles.label}>
          {mode === 'link' ? 'Пароль от аккаунта' : 'Придумайте пароль'}{' '}
          <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.passwordWrap}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
            value={form.password}
            onChangeText={(v) => field('password', v)}
            placeholder="Минимум 6 символов"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>

        {mode === 'register' && (
          <>
            <Text style={styles.label}>Повторите пароль <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={form.confirmPassword}
              onChangeText={(v) => field('confirmPassword', v)}
              placeholder="Повторите пароль"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          </>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>
              {mode === 'link' ? 'Войти и привязать' : 'Создать аккаунт'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  back: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 24, lineHeight: 19 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  tabActive: { backgroundColor: COLORS.accent },
  tabText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 0 },
  label: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  required: { color: COLORS.error },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 0,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingRight: 12,
  },
  eyeBtn: { padding: 4 },
  error: { color: COLORS.error, fontSize: 13, marginTop: 12, marginBottom: 4, textAlign: 'center' },
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
