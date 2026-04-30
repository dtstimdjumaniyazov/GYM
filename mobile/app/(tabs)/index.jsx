import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator,
} from 'react-native'
import { useSelector } from 'react-redux'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { COLORS } from '../../src/constants/colors'
import { ENDPOINTS } from '../../src/constants/api'
import api from '../../src/services/api'
import { useCategories } from '../../src/hooks/useCategories'

export default function HomeScreen() {
  const { user } = useSelector((state) => state.auth)
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { t } = useTranslation()
  const { categories, isLoading: catsLoading } = useCategories()
  const [unreadCount, setUnreadCount] = useState(0)
  const [newCourses, setNewCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [trainers, setTrainers] = useState([])
  const [trainersLoading, setTrainersLoading] = useState(true)

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await api.get(ENDPOINTS.NOTIFICATIONS)
      setUnreadCount(data.filter((n) => !n.is_read).length)
    } catch { /* silent */ }
  }, [])

  const fetchNewCourses = useCallback(async () => {
    try {
      const { data } = await api.get(ENDPOINTS.COURSES)
      const results = data.results || data
      setNewCourses(results.slice(0, 6))
    } catch { /* silent */ }
    finally { setCoursesLoading(false) }
  }, [])

  const fetchTrainers = useCallback(async () => {
    try {
      const { data } = await api.get(ENDPOINTS.TRAINERS)
      const results = data.results || data
      setTrainers(results.slice(0, 10))
    } catch { /* silent */ }
    finally { setTrainersLoading(false) }
  }, [])

  useFocusEffect(useCallback(() => {
    fetchUnread()
    fetchNewCourses()
    fetchTrainers()
  }, [fetchUnread, fetchNewCourses, fetchTrainers]))

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t('home.greeting_morning')
    if (hour < 18) return t('home.greeting_day')
    return t('home.greeting_evening')
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.name}>{user?.first_name || t('home.default_name')} 💪</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.header} />
          {unreadCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerLabel}>{t('home.banner_label')}</Text>
          <Text style={styles.bannerTitle}>{t('home.banner_title')}</Text>
          <TouchableOpacity style={styles.bannerBtn} onPress={() => router.push('/(tabs)/catalog')}>
            <Text style={styles.bannerBtnText}>{t('home.banner_btn')}</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.bannerDecor}>
          <Text style={styles.bannerEmoji}>🏋️</Text>
        </View>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t('home.categories')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/catalog')}>
            <Text style={styles.seeAll}>{t('home.see_all')}</Text>
          </TouchableOpacity>
        </View>

        {catsLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => router.push(`/(tabs)/catalog?category=${cat.id}`)}
              >
                {cat.icon_url && (
                  <Image source={{ uri: cat.icon_url }} style={styles.categoryImg} resizeMode="cover" />
                )}
                <View style={styles.categoryOverlay} />
                <Text style={styles.categoryTitle}>{cat.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Trainers */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t('home.trainers')}</Text>
        </View>
        {trainersLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trainersRow}>
            {trainers.map((trainer) => {
              const photo = trainer.photo_url || trainer.avatar_url
              const initials = [trainer.first_name?.[0], trainer.last_name?.[0]].filter(Boolean).join('') || '?'
              return (
                <TouchableOpacity
                  key={trainer.id}
                  style={styles.trainerCard}
                  onPress={() => router.push(`/trainer/${trainer.id}`)}
                  activeOpacity={0.85}
                >
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.trainerAvatar} />
                  ) : (
                    <View style={[styles.trainerAvatar, styles.trainerAvatarFallback]}>
                      <Text style={styles.trainerInitials}>{initials}</Text>
                    </View>
                  )}
                  {trainer.is_verified && (
                    <View style={styles.trainerVerified}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    </View>
                  )}
                  <Text style={styles.trainerName} numberOfLines={1}>
                    {trainer.first_name} {trainer.last_name}
                  </Text>
                  {trainer.specialization ? (
                    <Text style={styles.trainerSpec} numberOfLines={1}>{trainer.specialization}</Text>
                  ) : null}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}
      </View>

      {/* New Courses */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t('home.new_courses')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/catalog')}>
            <Text style={styles.seeAll}>{t('home.see_all_courses')}</Text>
          </TouchableOpacity>
        </View>

        {coursesLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.newCoursesGrid}>
            {newCourses.map((course) => (
              <TouchableOpacity
                key={course.id}
                style={styles.courseCard}
                onPress={() => router.push(`/course/${course.id}`)}
                activeOpacity={0.85}
              >
                {course.cover_url ? (
                  <Image source={{ uri: course.cover_url }} style={styles.courseCover} resizeMode="cover" />
                ) : (
                  <View style={[styles.courseCover, styles.courseCoverPlaceholder]}>
                    <Ionicons name="barbell-outline" size={28} color={COLORS.textSecondary} />
                  </View>
                )}
                <View style={styles.courseInfo}>
                  <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
                  <Text style={styles.courseTrainer} numberOfLines={1}>{course.trainer_name}</Text>
                  <View style={styles.courseFooter}>
                    <Text style={styles.coursePrice}>
                      {Number(course.price || 0).toLocaleString('ru-RU')} {t('home.sum')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingBottom: 24 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  greeting: { fontSize: 14, color: COLORS.textSecondary },
  name: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  notifBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,
    elevation: 3,
  },
  notifBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#EF4444', borderRadius: 6,
    minWidth: 14, height: 14, paddingHorizontal: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  notifBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },

  banner: {
    backgroundColor: COLORS.header, borderRadius: 20, padding: 24,
    marginBottom: 28, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', minHeight: 160,
  },
  bannerContent: { flex: 1 },
  bannerLabel: { fontSize: 12, color: COLORS.white, opacity: 0.7, letterSpacing: 1, marginBottom: 6 },
  bannerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white, lineHeight: 30, marginBottom: 16 },
  bannerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, alignSelf: 'flex-start',
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12,
  },
  bannerBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
  bannerDecor: { marginLeft: 12 },
  bannerEmoji: { fontSize: 64 },

  section: { marginBottom: 28 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  seeAll: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },

  categoriesRow: { gap: 14, paddingRight: 4 },
  categoryCard: {
    width: 150, height: 160,
    borderRadius: 18, overflow: 'hidden',
    backgroundColor: COLORS.primary,
    justifyContent: 'flex-end',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8,
    elevation: 3,
  },
  categoryImg: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  categoryTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.white,
    textAlign: 'center', lineHeight: 18, padding: 10,
  },

  emptyCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 40,
    alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },

  trainersRow: { gap: 16, paddingRight: 4 },
  trainerCard: { alignItems: 'center', width: 80 },
  trainerAvatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 8 },
  trainerAvatarFallback: {
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  trainerInitials: { fontSize: 24, fontWeight: '700', color: COLORS.white },
  trainerVerified: {
    position: 'absolute', top: 50, right: 0,
    backgroundColor: COLORS.white, borderRadius: 8,
  },
  trainerName: { fontSize: 12, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  trainerSpec: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },

  newCoursesGrid: { gap: 12 },
  courseCard: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    borderRadius: 16, overflow: 'hidden',
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
  },
  courseCover: { width: 90, height: 110 },
  courseCoverPlaceholder: {
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center', alignItems: 'center',
  },
  courseInfo: { flex: 1, padding: 12, justifyContent: 'space-between' },
  courseTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 19 },
  courseTrainer: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  courseFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  coursePrice: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  courseRating: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
})
