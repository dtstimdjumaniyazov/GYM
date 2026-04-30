import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { login, clearError } from '../../src/store/authSlice'
import { COLORS } from '../../src/constants/colors'

export default function LoginScreen() {
  const [phone, setPhone] = useState('+998')
  const [password, setPassword] = useState('')
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Fit Evolution</Text>
        <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

        {error && (
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

        <TouchableOpacity onPress={() => router.push('/auth/register')}>
          <Text style={styles.link}>{t('auth.no_account')}</Text>
        </TouchableOpacity>
      </View>
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
  link: { color: COLORS.white, textAlign: 'center', opacity: 0.8, textDecorationLine: 'underline' },
})
