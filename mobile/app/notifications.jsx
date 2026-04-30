import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { COLORS } from '../src/constants/colors'
import { ENDPOINTS } from '../src/constants/api'
import api from '../src/services/api'

const TYPE_META = {
  course_submitted:        { icon: 'send-outline',          color: '#6366F1' },
  course_published:        { icon: 'checkmark-circle-outline', color: '#10B981' },
  course_revision:         { icon: 'create-outline',         color: '#F59E0B' },
  trainer_verified:        { icon: 'shield-checkmark-outline', color: '#10B981' },
  verification_requested:  { icon: 'person-add-outline',     color: '#6366F1' },
  course_deletion_approved:{ icon: 'trash-outline',          color: '#EF4444' },
  course_deletion_rejected:{ icon: 'close-circle-outline',   color: '#EF4444' },
}

function formatDate(dateStr, t) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return t('notifications.just_now')
  if (diffMin < 60) return t('notifications.minutes_ago', { count: diffMin })
  if (diffHr < 24) return t('notifications.hours_ago', { count: diffHr })
  if (diffDay < 7) return t('notifications.days_ago', { count: diffDay })
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { t } = useTranslation()
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const load = useCallback(async (refresh = false) => {
    refresh ? setIsRefreshing(true) : setIsLoading(true)
    try {
      const { data } = await api.get(ENDPOINTS.NOTIFICATIONS)
      setNotifications(data)
    } catch { /* silent */ }
    finally { setIsLoading(false); setIsRefreshing(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleMarkAllRead = useCallback(async () => {
    try {
      await api.post(ENDPOINTS.NOTIFICATIONS_MARK_ALL_READ)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch { /* silent */ }
  }, [])

  const handleMarkRead = useCallback(async (id) => {
    try {
      await api.patch(ENDPOINTS.NOTIFICATION_MARK_READ(id))
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, is_read: true } : n)
      )
    } catch { /* silent */ }
  }, [])

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>{t('notifications.mark_all')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>{t('notifications.empty_title')}</Text>
          <Text style={styles.emptyDesc}>{t('notifications.empty_desc')}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />
          }
          renderItem={({ item }) => (
            <NotificationItem notification={item} onRead={handleMarkRead} t={t} />
          )}
        />
      )}
    </View>
  )
}

function NotificationItem({ notification, onRead, t }) {
  const meta = TYPE_META[notification.type] || { icon: 'notifications-outline', color: COLORS.primary }
  const isUnread = !notification.is_read

  const handlePress = () => {
    if (isUnread) onRead(notification.id)
  }

  return (
    <TouchableOpacity
      style={[styles.item, isUnread && styles.itemUnread]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: meta.color + '18' }]}>
        <Ionicons name={meta.icon} size={22} color={meta.color} />
      </View>

      {/* Content */}
      <View style={styles.itemBody}>
        <View style={styles.itemTop}>
          <Text style={[styles.itemTitle, isUnread && styles.itemTitleUnread]} numberOfLines={2}>
            {notification.title}
          </Text>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
        {notification.body ? (
          <Text style={styles.itemBody2} numberOfLines={3}>{notification.body}</Text>
        ) : null}
        <Text style={styles.itemDate}>{formatDate(notification.created_at, t)}</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: COLORS.text },
  markAllBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: COLORS.lightGray, borderRadius: 10,
  },
  markAllText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  list: { padding: 16, gap: 10, paddingBottom: 40 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },

  item: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: COLORS.white, borderRadius: 16, padding: 14,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  itemUnread: {
    backgroundColor: '#EEF0FB',
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },

  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },

  itemBody: { flex: 1, gap: 4 },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  itemTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text, lineHeight: 20 },
  itemTitleUnread: { color: COLORS.header },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary, marginTop: 6, flexShrink: 0,
  },
  itemBody2: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  itemDate: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
})
