import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Linking,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { register, clearError } from '../../src/store/authSlice'
import { COLORS } from '../../src/constants/colors'

const WEBSITE_URL = 'https://fitevolution.uz/register'

function Checkbox({ checked, onPress, label, labelRight }) {
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={styles.checkLabel}>{label}{labelRight}</Text>
    </TouchableOpacity>
  )
}

export default function RegisterScreen() {
  const [role, setRole] = useState('student')
  const [form, setForm] = useState({
    phone: '+998',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
  })
  const [consents, setConsents] = useState({
    terms: false,
    privacy: false,
    marketing: false,
  })
  const [localError, setLocalError] = useState('')

  const router = useRouter()
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const { isLoading, error } = useSelector((s) => s.auth)

  const setField = (key, value) => {
    dispatch(clearError())
    setLocalError('')
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    setLocalError('')

    if (!form.phone || !form.password || !form.confirmPassword) {
      setLocalError(t('register.fill_required'))
      return
    }
    if (form.password.length < 6) {
      setLocalError(t('register.password_too_short'))
      return
    }
    if (form.password !== form.confirmPassword) {
      setLocalError(t('register.passwords_dont_match'))
      return
    }
    if (!consents.terms || !consents.privacy) {
      setLocalError(t('register.must_agree_terms'))
      return
    }

    const body = {
      phone: form.phone,
      password: form.password,
      first_name: form.first_name,
      last_name: form.last_name,
      role: 'student',
      marketing_consent: consents.marketing,
    }

    const result = await dispatch(register(body))
    if (register.fulfilled.match(result)) {
      router.replace('/(tabs)')
    }
  }

  const serverError = error?.detail || error?.phone?.[0] || error?.password?.[0]
  const displayError = localError || serverError

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Fit Evolution</Text>
        <Text style={styles.subtitle}>{t('register.subtitle')}</Text>

        {/* Role selector */}
        <View style={styles.roleRow}>
          {['student', 'trainer'].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => { setRole(r); dispatch(clearError()); setLocalError('') }}
            >
              <Text style={styles.roleEmoji}>{r === 'student' ? '🎓' : '💪'}</Text>
              <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                {t(`register.i_am_${r}`)}
              </Text>
              <Text style={styles.roleDesc}>{t(`register.${r}_desc`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Trainer: redirect to website */}
        {role === 'trainer' ? (
          <View style={styles.trainerCard}>
            <Text style={styles.trainerCardTitle}>{t('register.trainer_web_title')}</Text>
            <Text style={styles.trainerCardDesc}>{t('register.trainer_web_desc')}</Text>
            <TouchableOpacity
              style={styles.trainerWebBtn}
              onPress={() => Linking.openURL(WEBSITE_URL)}
            >
              <Text style={styles.trainerWebBtnText}>{t('register.trainer_web_btn')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {displayError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            )}

            {/* Name row */}
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.inputHalf]}
                value={form.first_name}
                onChangeText={(v) => setField('first_name', v)}
                placeholder={t('register.first_name')}
                placeholderTextColor={COLORS.textSecondary}
              />
              <TextInput
                style={[styles.input, styles.inputHalf]}
                value={form.last_name}
                onChangeText={(v) => setField('last_name', v)}
                placeholder={t('register.last_name')}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(v) => setField('phone', v)}
              placeholder="+998 90 000 00 00"
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholderTextColor={COLORS.textSecondary}
            />

            <TextInput
              style={styles.input}
              value={form.password}
              onChangeText={(v) => setField('password', v)}
              placeholder={t('register.min_6_chars')}
              secureTextEntry
              placeholderTextColor={COLORS.textSecondary}
            />

            <TextInput
              style={styles.input}
              value={form.confirmPassword}
              onChangeText={(v) => setField('confirmPassword', v)}
              placeholder={t('register.repeat_password')}
              secureTextEntry
              placeholderTextColor={COLORS.textSecondary}
            />

            {/* Consents */}
            <View style={styles.consentsBlock}>
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setConsents((p) => ({ ...p, terms: !p.terms }))}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, consents.terms && styles.checkboxChecked]}>
                  {consents.terms && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>
                  {t('register.consent_terms')}
                  <Text style={styles.checkLink} onPress={() => Linking.openURL('https://fitevolution.uz/terms')}>
                    {t('register.consent_terms_link')}
                  </Text>
                  {t('register.consent_and')}
                  <Text style={styles.checkLink} onPress={() => Linking.openURL('https://fitevolution.uz/privacy')}>
                    {t('register.consent_privacy_link')}
                  </Text>
                  {' '}
                  <Text style={styles.required}>*</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setConsents((p) => ({ ...p, privacy: !p.privacy }))}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, consents.privacy && styles.checkboxChecked]}>
                  {consents.privacy && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>
                  {t('register.consent_privacy')}
                  {' '}
                  <Text style={styles.required}>*</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setConsents((p) => ({ ...p, marketing: !p.marketing }))}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, consents.marketing && styles.checkboxChecked]}>
                  {consents.marketing && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.checkLabel, styles.checkLabelMuted]}>
                  {t('register.consent_marketing')}
                  {' '}
                  <Text style={styles.optional}>({t('register.consent_optional')})</Text>
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.buttonText}>{t('register.register_button')}</Text>
              }
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity onPress={() => router.back()} style={styles.loginLinkRow}>
          <Text style={styles.loginLinkText}>
            {t('register.already_have_account')}{' '}
            <Text style={styles.loginLink}>{t('register.login_link')}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.header },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 48 },

  title: { fontSize: 32, fontWeight: '700', color: COLORS.white, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 16, color: COLORS.white, opacity: 0.8, textAlign: 'center', marginBottom: 24 },

  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleBtn: {
    flex: 1, alignItems: 'center', padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 2, borderColor: 'transparent',
  },
  roleBtnActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(83,101,202,0.25)' },
  roleEmoji: { fontSize: 24, marginBottom: 4 },
  roleBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  roleBtnTextActive: { color: COLORS.white },
  roleDesc: { fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },

  trainerCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20,
  },
  trainerCardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.white, marginBottom: 10, textAlign: 'center' },
  trainerCardDesc: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  trainerWebBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24,
  },
  trainerWebBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  errorBox: {
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 12,
  },
  errorText: { color: COLORS.error, fontSize: 13, textAlign: 'center' },

  row: { flexDirection: 'row', gap: 10, marginBottom: 0 },
  input: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 16,
    fontSize: 16, marginBottom: 12, color: COLORS.text,
  },
  inputHalf: { flex: 1 },

  consentsBlock: { marginTop: 4, marginBottom: 16, gap: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  checkLabel: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  checkLabelMuted: { color: 'rgba(255,255,255,0.55)' },
  checkLink: { color: '#93C5FD', textDecorationLine: 'underline' },
  required: { color: '#FCA5A5' },
  optional: { color: 'rgba(255,255,255,0.35)' },

  button: {
    backgroundColor: COLORS.primary, borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 16,
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },

  loginLinkRow: { alignItems: 'center', marginTop: 8 },
  loginLinkText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  loginLink: { color: COLORS.white, textDecorationLine: 'underline', fontWeight: '600' },
})
