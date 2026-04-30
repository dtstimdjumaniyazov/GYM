import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { COLORS } from '../../src/constants/colors'

export default function RegisterScreen() {
  const router = useRouter()
  const { t } = useTranslation()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('register.title')}</Text>
      <Text style={styles.subtitle}>{t('register.subtitle')}</Text>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>{t('register.back')}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.header, padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  subtitle: { color: COLORS.white, opacity: 0.7, marginBottom: 24 },
  link: { color: COLORS.white, textDecorationLine: 'underline' },
})
