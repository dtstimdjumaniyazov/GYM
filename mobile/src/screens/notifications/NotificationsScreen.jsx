import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useEffect } from 'react'
import { useGetNotificationsQuery, useMarkAllReadMutation } from '../../api/coursesApi'
import { COLORS } from '../../theme'

export default function NotificationsScreen({ navigation }) {
  const { data: notifications = [], isLoading } = useGetNotificationsQuery()
  const [markAllRead] = useMarkAllReadMutation()

  useEffect(() => {
    if (notifications.some((n) => !n.is_read)) markAllRead()
  }, [notifications])

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.accent} size="large" /></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹ Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Уведомления</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.item, !item.is_read && styles.itemUnread]}>
            {!item.is_read && <View style={styles.dot} />}
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              {!!item.body && <Text style={styles.itemBody2}>{item.body}</Text>}
              <Text style={styles.itemTime}>
                {new Date(item.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Нет уведомлений</Text>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 },
  back: { marginBottom: 8 },
  backText: { color: COLORS.accent, fontSize: 16 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  list: { padding: 16, gap: 8 },
  item: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  itemUnread: { borderColor: COLORS.accent + '40', backgroundColor: COLORS.surfaceActive },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent, marginTop: 5, flexShrink: 0 },
  itemBody: { flex: 1 },
  itemTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginBottom: 3 },
  itemBody2: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 4 },
  itemTime: { color: COLORS.textMuted, fontSize: 12 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 60, fontSize: 15 },
})
