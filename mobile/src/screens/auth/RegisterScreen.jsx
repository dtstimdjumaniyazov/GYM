import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { useDispatch } from 'react-redux'
import { Ionicons } from '@expo/vector-icons'
import { useRegisterMutation } from '../../api/authApi'
import { setCredentials } from '../../store/authSlice'
import { COLORS } from '../../theme'

const TERMS_URL = 'https://fitevolution.uz/terms'
const PRIVACY_URL = 'https://fitevolution.uz/privacy'

export default function RegisterScreen({ navigation }) {
  const dispatch = useDispatch()
  const [register, { isLoading }] = useRegisterMutation()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '+998',
    password: '',
    confirmPassword: '',
  })
  const [consents, setConsents] = useState({ terms: false, privacy: false, marketing: false })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  function field(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleConsent(key) {
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleRegister() {
    setError('')

    if (!form.phone.trim() || !form.password || !form.confirmPassword) {
      setError('Заполните все обязательные поля')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Пароли не совпадают')
      return
    }
    if (form.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return
    }
    if (!consents.terms || !consents.privacy) {
      setError('Примите условия использования и политику конфиденциальности')
      return
    }

    try {
      const result = await register({
        phone: form.phone.trim(),
        password: form.password,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        role: 'student',
        marketing_consent: consents.marketing,
      }).unwrap()

      await SecureStore.setItemAsync('access_token', result.access)
      await SecureStore.setItemAsync('refresh_token', result.refresh)
      dispatch(setCredentials({ token: result.access, user: result.user }))
    } catch (err) {
      const data = err?.data
      setError(
        data?.phone?.[0] ||
        data?.password?.[0] ||
        data?.detail ||
        'Ошибка при регистрации'
      )
    }
  }

  const canSubmit = consents.terms && consents.privacy

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.title}>Регистрация</Text>
        <Text style={styles.subtitle}>Создайте аккаунт ученика</Text>

        {/* Name */}
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

        {/* Phone */}
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

        {/* Password */}
        <Text style={styles.label}>Пароль <Text style={styles.required}>*</Text></Text>
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
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Confirm password */}
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

        {/* Consents */}
        <View style={styles.consents}>
          <ConsentRow
            checked={consents.terms}
            onToggle={() => toggleConsent('terms')}
            required
          >
            <Text style={styles.consentText}>
              Я согласен(-на) с{' '}
              <Text style={styles.link}>Пользовательским соглашением</Text>
              {' '}и{' '}
              <Text style={styles.link}>Политикой конфиденциальности</Text>.
              Подтверждаю, что мне исполнилось 16 лет.
            </Text>
          </ConsentRow>

          <ConsentRow
            checked={consents.privacy}
            onToggle={() => toggleConsent('privacy')}
            required
          >
            <Text style={styles.consentText}>
              Я даю согласие на обработку персональных данных в соответствии с действующим законодательством.
            </Text>
          </ConsentRow>

          <ConsentRow
            checked={consents.marketing}
            onToggle={() => toggleConsent('marketing')}
          >
            <Text style={styles.consentText}>
              Согласен(-на) получать новости и акции платформы{' '}
              <Text style={styles.optional}>(необязательно)</Text>
            </Text>
          </ConsentRow>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, !canSubmit && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={isLoading || !canSubmit}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Зарегистрироваться</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.loginLink}>
          <Text style={styles.loginLinkText}>
            Уже есть аккаунт? <Text style={styles.loginLinkAccent}>Войти</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function ConsentRow({ checked, onToggle, required, children }) {
  return (
    <TouchableOpacity style={consentStyles.row} onPress={onToggle} activeOpacity={0.7}>
      <View style={[consentStyles.box, checked && consentStyles.boxChecked]}>
        {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
      </View>
      <View style={{ flex: 1 }}>
        {children}
        {required && <Text style={consentStyles.required}>*</Text>}
      </View>
    </TouchableOpacity>
  )
}

const consentStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 12 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  boxChecked: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  required: { color: COLORS.error, fontSize: 11, marginTop: 2 },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  back: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 24 },
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
    marginBottom: 0,
  },
  eyeBtn: { padding: 4 },
  consents: { marginTop: 20, marginBottom: 4 },
  consentText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  link: { color: COLORS.accent },
  optional: { color: COLORS.textMuted },
  error: { color: COLORS.error, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loginLink: { marginTop: 20, alignItems: 'center' },
  loginLinkText: { color: COLORS.textMuted, fontSize: 14 },
  loginLinkAccent: { color: COLORS.accent, fontWeight: '600' },
})
