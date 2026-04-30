import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { COLORS } from '../src/constants/colors'
import { ENDPOINTS } from '../src/constants/api'
import api from '../src/services/api'

export default function FavoritesScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const load = useCallback(async (refresh = false) => {
    refresh ? setIsRefreshing(true) : setIsLoading(true)
    try {
      const { data } = await api.get(ENDPOINTS.FAVORITES)
      setCourses(data.results || data)
    } catch { /* silent */ }
    finally { setIsLoading(false); setIsRefreshing(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const handleToggleFavorite = useCallback(async (courseId) => {
    try {
      await api.post(ENDPOINTS.FAVORITE_TOGGLE(courseId))
      setCourses((prev) => prev.filter((c) => c.id !== courseId))
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
        <Text style={styles.headerTitle}>{t('favorites.title')}</Text>
        {courses.length > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{courses.length}</Text>
          </View>
        )}
      </View>

      {courses.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🤍</Text>
          <Text style={styles.emptyTitle}>{t('favorites.empty_title')}</Text>
          <Text style={styles.emptyDesc}>{t('favorites.empty_desc')}</Text>
          <TouchableOpacity style={styles.catalogBtn} onPress={() => router.push('/(tabs)/catalog')}>
            <Text style={styles.catalogBtnText}>{t('favorites.go_catalog')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />
          }
          renderItem={({ item }) => (
            <FavoriteCourseCard
              course={item}
              onPress={() => router.push(`/course/${item.id}`)}
              onRemove={() => handleToggleFavorite(item.id)}
            />
          )}
        />
      )}
    </View>
  )
}

function FavoriteCourseCard({ course, onPress, onRemove }) {
  const { t } = useTranslation()

  const LEVEL_LABELS = {
    beginner: t('course.level_beginner'),
    intermediate: t('course.level_intermediate'),
    advanced: t('course.level_advanced'),
  }
  const FORMAT_LABELS = {
    home: t('course.format_home'),
    gym: t('course.format_gym'),
    mixed: t('course.format_mixed'),
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {course.cover_url ? (
        <Image source={{ uri: course.cover_url }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Ionicons name="barbell-outline" size={28} color={COLORS.textSecondary} />
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={2}>{course.title}</Text>
          <TouchableOpacity onPress={onRemove} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="heart" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <Text style={styles.cardTrainer} numberOfLines={1}>{course.trainer_name}</Text>

        <View style={styles.badges}>
          {course.level && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{LEVEL_LABELS[course.level] || course.level}</Text>
            </View>
          )}
          {course.format && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{FORMAT_LABELS[course.format] || course.format}</Text>
            </View>
          )}
          {course.duration_weeks && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{course.duration_weeks} {t('favorites.weeks')}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.price}>
            {Number(course.price || 0).toLocaleString('ru-RU')} {t('favorites.sum')}
          </Text>
        </View>
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
  headerBadge: {
    backgroundColor: COLORS.primary, paddingHorizontal: 9, paddingVertical: 2,
    borderRadius: 12, overflow: 'hidden',
  },
  headerBadgeText: { fontSize: 13, fontWeight: '700', color: COLORS.white },

  list: { padding: 16, gap: 12, paddingBottom: 40 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  catalogBtn: { marginTop: 8, backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 },
  catalogBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

  card: {
    backgroundColor: COLORS.white, borderRadius: 16,
    flexDirection: 'row', overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
  },
  cover: { width: 100, height: 130 },
  coverPlaceholder: { backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },

  cardBody: { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 19 },
  removeBtn: { padding: 2 },
  cardTrainer: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  badge: { backgroundColor: COLORS.lightGray, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  price: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  rating: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
})
