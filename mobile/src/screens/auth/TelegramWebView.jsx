import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { WebView } from 'react-native-webview'
import { useState } from 'react'
import { COLORS } from '../../theme'

const WIDGET_URL = 'https://fitevolution.uz/api/users/auth/telegram/widget/'

export default function TelegramWebView({ visible, onAuth, onClose }) {
  const [loading, setLoading] = useState(true)

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Вход через Telegram</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Закрыть</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <ActivityIndicator
            color={COLORS.accent}
            style={styles.loader}
            size="large"
          />
        )}

        <WebView
          source={{ uri: WIDGET_URL }}
          onLoadEnd={() => setLoading(false)}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data)
              onAuth(data)
            } catch {}
          }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  closeBtn: { padding: 4 },
  closeText: { color: COLORS.accent, fontSize: 16 },
  loader: { position: 'absolute', top: '50%', alignSelf: 'center', zIndex: 10 },
  webview: { flex: 1 },
})
