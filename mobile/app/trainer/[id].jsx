import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Linking,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { COLORS } from '../../src/constants/colors'
import { ENDPOINTS } from '../../src/constants/api'
import api from '../../src/services/api'

export default function TrainerScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const [trainer, setTrainer] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.get(ENDPOINTS.TRAINER_DETAIL(id))
      .then(({ data }) => setTrainer(data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (!trainer) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{t('trainer.not_found')}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>{t('trainer.back')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

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

  const photo = trainer.photo_url || trainer.avatar_url
  const initials = [trainer.first_name?.[0], trainer.last_name?.[0]].filter(Boolean).join('') || '?'
  const experienceYears = trainer.experience_years

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.headerBg, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.avatarWrap}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.trainerName}>
            {trainer.first_name} {trainer.last_name}
          </Text>
          {trainer.is_verified && (
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          )}
        </View>

        {trainer.specialization ? (
          <Text style={styles.specialization}>{trainer.specialization}</Text>
        ) : null}

        <View style={styles.statsRow}>
          {experienceYears != null && (
            <View style={styles.stat}>
              <Text style={styles.statValue}>{experienceYears}</Text>
              <Text style={styles.statLabel}>{t('trainer.experience_years')}</Text>
            </View>
          )}
          {trainer.courses_count != null && (
            <View style={[styles.stat, experienceYears != null && styles.statBorder]}>
              <Text style={styles.statValue}>{trainer.courses_count}</Text>
              <Text style={styles.statLabel}>{t('trainer.courses_count')}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.body}>
        {/* Bio */}
        {(trainer.bio || trainer.short_description) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('trainer.about')}</Text>
            <View style={styles.bioCard}>
              <Text style={styles.bioText}>{trainer.bio || trainer.short_description}</Text>
            </View>
          </View>
        ) : null}

        {/* Instagram */}
        {trainer.instagram_url ? (
          <TouchableOpacity
            style={styles.instagramBtn}
            onPress={() => Linking.openURL(trainer.instagram_url)}
          >
            <Ionicons name="logo-instagram" size={18} color="#E1306C" />
            <Text style={styles.instagramText}>Instagram</Text>
            <Ionicons name="open-outline" size={14} color={COLORS.textSecondary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ) : null}

        {/* Courses */}
        {trainer.courses?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('trainer.courses_title')}</Text>
            <View style={styles.coursesList}>
              {trainer.courses.map((course) => (
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
                      <Ionicons name="barbell-outline" size={24} color={COLORS.textSecondary} />
                    </View>
                  )}
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
                    <View style={styles.courseBadges}>
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
                    </View>
                    <View style={styles.courseFooter}>
                      <Text style={styles.coursePrice}>
                        {Number(course.price || 0).toLocaleString('ru-RU')} {t('trainer.sum')}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 16, color: COLORS.textSecondary },
  backLink: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },

  headerBg: {
    backgroundColor: COLORS.header,
    alignItems: 'center',
    paddingBottom: 28, paddingHorizontal: 20,
  },
  backBtn: {
    alignSelf: 'flex-start', padding: 4, marginBottom: 16,
  },
  avatarWrap: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 14, overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: {
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 36, fontWeight: '700', color: COLORS.white },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  trainerName: { fontSize: 20, fontWeight: '700', color: COLORS.white },
  specialization: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 16 },

  statsRow: { flexDirection: 'row', marginTop: 8 },
  stat: { alignItems: 'center', paddingHorizontal: 24 },
  statBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  body: { padding: 16 },

  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  bioCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  bioText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },

  instagramBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginTop: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  instagramText: { fontSize: 14, fontWeight: '600', color: COLORS.text },

  coursesList: { gap: 10 },
  courseCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.white, borderRadius: 14, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
    paddingRight: 12,
  },
  courseCover: { width: 80, height: 90 },
  courseCoverPlaceholder: { backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  courseInfo: { flex: 1, paddingVertical: 10 },
  courseTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 19 },
  courseBadges: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  badge: { backgroundColor: COLORS.lightGray, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, color: COLORS.textSecondary },
  courseFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  coursePrice: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  courseRating: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
})
