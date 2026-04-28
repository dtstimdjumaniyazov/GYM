import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useRequestOtpMutation } from '../../api/authApi'
import { COLORS, FONTS } from '../../theme'

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('+998')
  const [error, setError] = useState('')
  const [requestOtp, { isLoading }] = useRequestOtpMutation()

  async function handleSend() {
    setError('')
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 12) {
      setError('Введите корректный номер телефона')
      return
    }
    try {
      await requestOtp(phone).unwrap()
      navigation.navigate('Otp', { phone })
    } catch (err) {
      setError(err?.data?.detail || 'Ошибка. Попробуйте снова.')
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>FitEvolution</Text>
        <Text style={styles.title}>Вход</Text>
        <Text style={styles.subtitle}>Введите номер телефона — мы отправим код подтверждения</Text>

        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+998 XX XXX XX XX"
          placeholderTextColor={COLORS.textMuted}
          autoFocus
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.btn} onPress={handleSend} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Получить код</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo: { fontSize: 28, fontWeight: '800', color: COLORS.accent, textAlign: 'center', marginBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 28, lineHeight: 20 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 12,
    letterSpacing: 1,
  },
  error: { color: '#f87171', fontSize: 13, marginBottom: 12 },
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
