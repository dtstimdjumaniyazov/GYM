import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { socialLink, socialRegister, clearError } from '../../src/store/authSlice'
import { COLORS } from '../../src/constants/colors'

export default function SocialLinkScreen() {
  const router = useRouter()
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const { isLoading } = useSelector((s) => s.auth)

  const { socialToken, provider, socialName } = useLocalSearchParams()

  const [tab, setTab] = useState('link')
  const [localError, setLocalError] = useState('')

  const [linkForm, setLinkForm] = useState({ phone: '+998', password: '' })
  const [regForm, setRegForm] = useState({
    phone: '+998',
    password: '',
    confirmPassword: '',
    firstName: socialName || '',
    lastName: '',
  })

  if (!socialToken) {
    router.replace('/auth/login')
    return null
  }

  const providerHint = provider === 'google'
    ? t('social_link.hint_google')
    : t('social_link.hint_telegram')

  const nameHint = socialName ? t('social_link.hint_as', { name: socialName }) : ''

  const handleLink = async () => {
    setLocalError('')
    if (!linkForm.phone || !linkForm.password) {
      setLocalError(t('social_link.error_fields'))
      return
    }
    const result = await dispatch(socialLink({
      socialToken,
      phone: linkForm.phone,
      password: linkForm.password,
    }))
    if (socialLink.fulfilled.match(result)) {
      router.replace('/(tabs)')
    } else {
      const err = result.payload
      setLocalError(err?.detail || err?.non_field_errors?.[0] || t('social_link.error_fields'))
    }
  }

  const handleRegister = async () => {
    setLocalError('')
    if (!regForm.phone || !regForm.password) {
      setLocalError(t('social_link.error_fields'))
      return
    }
    if (regForm.password.length < 6) {
      setLocalError(t('social_link.error_password_short'))
      return
    }
    if (regForm.password !== regForm.confirmPassword) {
      setLocalError(t('social_link.error_passwords_match'))
      return
    }
    const result = await dispatch(socialRegister({
      socialToken,
      phone: regForm.phone,
      password: regForm.password,
      firstName: regForm.firstName,
      lastName: regForm.lastName,
    }))
    if (socialRegister.fulfilled.match(result)) {
      router.replace('/(tabs)')
    } else {
      const err = result.payload
      setLocalError(err?.detail || err?.phone?.[0] || t('social_link.error_fields'))
    }
  }

  const changeTab = (newTab) => {
    setTab(newTab)
    setLocalError('')
    dispatch(clearError())
  }

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
        <Text style={styles.title}>{t('social_link.title')}</Text>

        {/* Provider hint banner */}
        <View style={styles.hintBanner}>
          <Text style={styles.hintProvider}>{providerHint}{nameHint}</Text>
          <Text style={styles.hintDesc}>{t('social_link.hint_desc')}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {['link', 'register'].map((tabKey) => (
            <TouchableOpacity
              key={tabKey}
              style={[styles.tab, tab === tabKey && styles.tabActive]}
              onPress={() => changeTab(tabKey)}
            >
              <Text style={[styles.tabText, tab === tabKey && styles.tabTextActive]}>
                {t(`social_link.tab_${tabKey}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {localError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{localError}</Text>
          </View>
        ) : null}

        {/* Link existing account */}
        {tab === 'link' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('social_link.link_title')}</Text>
            <Text style={styles.cardDesc}>{t('social_link.link_desc')}</Text>

            <TextInput
              style={styles.input}
              value={linkForm.phone}
              onChangeText={(v) => { setLocalError(''); setLinkForm((p) => ({ ...p, phone: v })) }}
              placeholder="+998 90 000 00 00"
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholderTextColor={COLORS.textSecondary}
            />
            <TextInput
              style={styles.input}
              value={linkForm.password}
              onChangeText={(v) => { setLocalError(''); setLinkForm((p) => ({ ...p, password: v })) }}
              placeholder={t('social_link.password')}
              secureTextEntry
              placeholderTextColor={COLORS.textSecondary}
            />

            <TouchableOpacity style={styles.button} onPress={handleLink} disabled={isLoading}>
              {isLoading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.buttonText}>{t('social_link.link_btn')}</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Register new account */}
        {tab === 'register' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('social_link.reg_title')}</Text>
            <Text style={styles.cardDesc}>{t('social_link.reg_desc')}</Text>

            <View style={styles.nameRow}>
              <TextInput
                style={[styles.input, styles.inputHalf]}
                value={regForm.firstName}
                onChangeText={(v) => { setLocalError(''); setRegForm((p) => ({ ...p, firstName: v })) }}
                placeholder={t('social_link.first_name')}
                placeholderTextColor={COLORS.textSecondary}
              />
              <TextInput
                style={[styles.input, styles.inputHalf]}
                value={regForm.lastName}
                onChangeText={(v) => { setLocalError(''); setRegForm((p) => ({ ...p, lastName: v })) }}
                placeholder={t('social_link.last_name')}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            <TextInput
              style={styles.input}
              value={regForm.phone}
              onChangeText={(v) => { setLocalError(''); setRegForm((p) => ({ ...p, phone: v })) }}
              placeholder="+998 90 000 00 00"
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholderTextColor={COLORS.textSecondary}
            />
            <TextInput
              style={styles.input}
              value={regForm.password}
              onChangeText={(v) => { setLocalError(''); setRegForm((p) => ({ ...p, password: v })) }}
              placeholder={t('social_link.password')}
              secureTextEntry
              placeholderTextColor={COLORS.textSecondary}
            />
            <TextInput
              style={styles.input}
              value={regForm.confirmPassword}
              onChangeText={(v) => { setLocalError(''); setRegForm((p) => ({ ...p, confirmPassword: v })) }}
              placeholder={t('social_link.confirm_password')}
              secureTextEntry
              placeholderTextColor={COLORS.textSecondary}
            />

            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={isLoading}>
              {isLoading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.buttonText}>{t('social_link.reg_btn')}</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity onPress={() => router.replace('/auth/login')} style={styles.backRow}>
          <Text style={styles.backText}>{t('social_link.back_to_login')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.header },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 32 },

  title: { fontSize: 26, fontWeight: '700', color: COLORS.white, textAlign: 'center', marginBottom: 16 },

  hintBanner: {
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14,
    padding: 16, marginBottom: 20, alignItems: 'center',
  },
  hintProvider: { fontSize: 15, fontWeight: '700', color: COLORS.white, marginBottom: 6 },
  hintDesc: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 19 },

  tabRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, padding: 4, marginBottom: 16, gap: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: COLORS.white },

  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { color: COLORS.error, fontSize: 13, textAlign: 'center' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 20,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white, marginBottom: 6 },
  cardDesc: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 16, lineHeight: 18 },

  nameRow: { flexDirection: 'row', gap: 10 },
  input: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 16,
    fontSize: 16, marginBottom: 12, color: COLORS.text,
  },
  inputHalf: { flex: 1 },

  button: {
    backgroundColor: COLORS.primary, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 4,
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },

  backRow: { alignItems: 'center', marginTop: 20 },
  backText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textDecorationLine: 'underline' },
})
