import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { login, googleLogin, telegramLogin, clearError } from '../../src/store/authSlice'
import { COLORS } from '../../src/constants/colors'

export default function LoginScreen() {
  const [phone, setPhone] = useState('+998')
  const [password, setPassword] = useState('')
  const [tgWaiting, setTgWaiting] = useState(false)
  const router = useRouter()
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const { isLoading, error } = useSelector((state) => state.auth)

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert(t('auth.error_title'), t('auth.error_fields'))
      return
    }
    const result = await dispatch(login({ phone, password }))
    if (login.fulfilled.match(result)) {
      router.replace('/(tabs)')
    }
  }

  const handleGoogleLogin = async () => {
    const result = await dispatch(googleLogin())
    if (googleLogin.fulfilled.match(result)) {
      router.replace('/(tabs)')
    } else if (result.payload?.pending_link) {
      Alert.alert(
        t('auth.google_pending_title'),
        t('auth.google_pending_desc'),
      )
    }
  }

  const handleTelegramLogin = async () => {
    setTgWaiting(true)
    const result = await dispatch(telegramLogin())
    setTgWaiting(false)
    if (telegramLogin.fulfilled.match(result)) {
      router.replace('/(tabs)')
    } else if (result.payload?.pending_link) {
      Alert.alert(t('auth.telegram_pending_title'), t('auth.telegram_pending_desc'))
    } else if (result.payload?.detail === 'telegram_timeout') {
      Alert.alert(t('auth.error_title'), t('auth.telegram_timeout'))
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Fit Evolution</Text>
        <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

        {error && !error.pending_link && (
          <Text style={styles.error}>
            {error.detail || t('auth.wrong_credentials')}
          </Text>
        )}

        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={(v) => { dispatch(clearError()); setPhone(v) }}
          placeholder="+998 90 000 00 00"
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholderTextColor={COLORS.textSecondary}
        />

        <TextInput
          style={styles.input}
          value={password}
          onChangeText={(v) => { dispatch(clearError()); setPassword(v) }}
          placeholder={t('auth.password_placeholder')}
          secureTextEntry
          placeholderTextColor={COLORS.textSecondary}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
          {isLoading
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.buttonText}>{t('auth.login_btn')}</Text>
          }
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleGoogleLogin}
          disabled={isLoading}
        >
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleBtnText}>{t('auth.google_btn')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.telegramBtn}
          onPress={handleTelegramLogin}
          disabled={isLoading}
        >
          <Text style={styles.telegramIcon}>✈</Text>
          <Text style={styles.telegramBtnText}>{t('auth.telegram_btn')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/auth/register')}>
          <Text style={styles.link}>{t('auth.no_account')}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={tgWaiting} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>✈️</Text>
            <Text style={styles.modalTitle}>{t('auth.tg_waiting_title')}</Text>
            <Text style={styles.modalDesc}>{t('auth.tg_waiting_desc')}</Text>
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
            <TouchableOpacity style={styles.modalCancel} onPress={() => setTgWaiting(false)}>
              <Text style={styles.modalCancelText}>{t('auth.tg_waiting_cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.header },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 32, fontWeight: '700', color: COLORS.white, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.white, opacity: 0.8, textAlign: 'center', marginBottom: 32 },
  error: { backgroundColor: '#FEE2E2', color: COLORS.error, padding: 12, borderRadius: 8, marginBottom: 16, textAlign: 'center' },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  dividerText: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  googleIcon: { fontSize: 18, fontWeight: '900', color: '#4285F4' },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.text },

  telegramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2AABEE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  telegramIcon: { fontSize: 18, color: COLORS.white },
  telegramBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.white },

  link: { color: COLORS.white, textAlign: 'center', opacity: 0.8, textDecorationLine: 'underline' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  modalBox: { backgroundColor: COLORS.white, borderRadius: 20, padding: 28, alignItems: 'center', width: '100%' },
  modalEmoji: { fontSize: 48, marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 10 },
  modalDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21 },
  modalCancel: { marginTop: 20, padding: 10 },
  modalCancelText: { fontSize: 14, color: COLORS.textSecondary },
})
