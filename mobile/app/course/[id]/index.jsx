import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Linking, Alert,
} from 'react-native'
import { usePreventScreenCapture } from 'expo-screen-capture'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSelector } from 'react-redux'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { COLORS } from '../../../src/constants/colors'
import { ENDPOINTS } from '../../../src/constants/api'
import api from '../../../src/services/api'

function toDirectUrl(url) {
  if (!url) return null
  const match = url.match(/\/file\/d\/([^/]+)/)
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`
  return url
}

export default function CourseDetailScreen() {
  usePreventScreenCapture()
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { isAuthenticated } = useSelector((s) => s.auth)
  const { t } = useTranslation()

  const [course, setCourse] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [favLoading, setFavLoading] = useState(false)

  const fetchCourse = useCallback(async () => {
    try {
      setError(null)
      const { data } = await api.get(ENDPOINTS.COURSE_DETAIL(id))
      setCourse(data)
    } catch (e) {
      setError(t('course.load_error'))
    } finally {
      setIsLoading(false)
    }
  }, [id, t])

  useEffect(() => { fetchCourse() }, [fetchCourse])

  const handleFavorite = async () => {
    if (!isAuthenticated) { router.push('/auth/login'); return }
    if (favLoading) return
    setFavLoading(true)
    try {
      await api.post(ENDPOINTS.FAVORITE_TOGGLE(id))
      setCourse((prev) => ({ ...prev, is_favorited: !prev.is_favorited }))
    } catch {
      Alert.alert(t('course.error_title'), t('course.error_favorite'))
    } finally {
      setFavLoading(false)
    }
  }

  const handleMainAction = () => {
    if (course.is_purchased) {
      router.push(`/course/${id}/lessons`)
    } else {
      const url = `https://fitevolution.uz/courses/${id}`
      Linking.openURL(url)
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (error || !course) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.border} />
        <Text style={styles.errorText}>{error || t('course.not_found')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t('course.back')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const coverUrl = toDirectUrl(course.cover_url)
  const trainerPhoto = toDirectUrl(course.trainer?.photo_url)
  const variantCount = course.training_variants?.length || 0

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ─── Cover + Back button ─── */}
        <View style={styles.coverContainer}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Ionicons name="barbell-outline" size={48} color={COLORS.border} />
            </View>
          )}
          <View style={styles.coverGradient} />
          <TouchableOpacity
            style={[styles.navBtn, { top: insets.top + 12 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          {isAuthenticated && (
            <TouchableOpacity
              style={[styles.favBtn, { top: insets.top + 12 }]}
              onPress={handleFavorite}
              disabled={favLoading}
            >
              <Ionicons
                name={course.is_favorited ? 'heart' : 'heart-outline'}
                size={22}
                color={course.is_favorited ? '#EF4444' : COLORS.white}
              />
            </TouchableOpacity>
          )}

          {/* Title over cover */}
          <View style={styles.coverTitle}>
            <Text style={styles.title}>{course.title}</Text>
            {course.short_description ? (
              <Text style={styles.shortDesc} numberOfLines={2}>{course.short_description}</Text>
            ) : null}
            <View style={styles.ratingRow}>
              <Text style={styles.ratingText}>{t('course.students', { count: course.purchases_count || 0 })}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* ─── Price + Action ─── */}
          <View style={styles.priceCard}>
            <View>
              <Text style={styles.price}>{Number(course.price).toLocaleString('ru-RU')} UZS</Text>
              {course.is_purchased && (
                <Text style={styles.purchasedBadge}>{t('course.purchased_badge')}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.actionBtn} onPress={handleMainAction}>
              <Text style={styles.actionBtnText}>
                {course.is_purchased ? t('course.continue') : t('course.buy')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ─── Meta badges ─── */}
          <View style={styles.badgesRow}>
            <MetaBadge label={t('course.level_label')} value={t(`course.level_${course.level}`) || course.level} />
            <MetaBadge label={t('course.format_label')} value={t(`course.format_${course.format}`) || course.format} />
            <MetaBadge label={t('course.lang_label')} value={t(`course.lang_${course.language}`) || course.language} />
            {course.duration_weeks > 0 && (
              <MetaBadge label={t('course.duration_label')} value={t('course.duration_value', { weeks: course.duration_weeks })} />
            )}
            {variantCount > 0 && (
              <MetaBadge label={t('course.variants_label')} value={t('course.variants_value', { count: variantCount })} />
            )}
            {course.target_weight_range && (
              <MetaBadge label={t('course.weight_label')} value={course.target_weight_range} />
            )}
          </View>

          {/* ─── Stats ─── */}
          {course.stats && (
            <SectionCard title={t('course.includes_title')}>
              <View style={styles.statsGrid}>
                <StatItem icon="🎬" label={t('course.stat_videos')} value={course.stats.video_count} />
                <StatItem icon="📄" label={t('course.stat_pdf')} value={course.stats.pdf_count} />
                <StatItem icon="🖼️" label={t('course.stat_images')} value={course.stats.image_count} />
              </View>
            </SectionCard>
          )}

          {/* ─── Trainer ─── */}
          {course.trainer && (
            <SectionCard title={t('course.trainer_title')}>
              <TrainerCard trainer={course.trainer} trainerName={course.trainer_name} router={router} t={t} />
            </SectionCard>
          )}

          {/* ─── Modules TOC ─── */}
          {course.modules?.length > 0 && (
            <SectionCard title={t('course.modules_title')}>
              {course.modules.map((module) => (
                <ModuleItem
                  key={module.id}
                  module={module}
                  trainingVariants={module.type === 'training' ? course.training_variants : null}
                  t={t}
                />
              ))}
            </SectionCard>
          )}

          {/* ─── Requirements ─── */}
          {course.requirements ? (
            <SectionCard title={t('course.requirements_title')}>
              <Text style={styles.bodyText}>{course.requirements}</Text>
            </SectionCard>
          ) : null}

          {/* ─── Goals ─── */}
          {course.goals_text ? (
            <SectionCard title={t('course.goals_title')}>
              <Text style={styles.bodyText}>{course.goals_text}</Text>
            </SectionCard>
          ) : null}

          {/* ─── Full description ─── */}
          {course.full_description ? (
            <SectionCard title={t('course.description_title')}>
              <Text style={styles.bodyText}>{course.full_description}</Text>
            </SectionCard>
          ) : null}

          {/* ─── About trainer (bio) ─── */}
          {course.trainer?.bio ? (
            <SectionCard title={t('course.trainer_bio_title')}>
              <Text style={styles.bodyText}>{course.trainer.bio}</Text>
            </SectionCard>
          ) : null}
        </View>
      </ScrollView>
    </View>
  )
}

/* ─── Small components ─── */

function SectionCard({ title, children }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function MetaBadge({ label, value }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeLabel}>{label}</Text>
      <Text style={styles.badgeValue}>{value}</Text>
    </View>
  )
}

function StatItem({ icon, label, value }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function TrainerCard({ trainer, trainerName, router, t }) {
  const [photoError, setPhotoError] = useState(false)
  const photoUrl = toDirectUrl(trainer.photo_url)
  const showPhoto = photoUrl && !photoError

  return (
    <>
      <TouchableOpacity
        style={styles.trainerRow}
        onPress={() => router.push(`/trainer/${trainer.id}`)}
        activeOpacity={0.75}
      >
        {showPhoto ? (
          <Image
            source={{ uri: photoUrl }}
            style={styles.trainerPhoto}
            onError={() => setPhotoError(true)}
          />
        ) : (
          <View style={[styles.trainerPhoto, styles.trainerPhotoFallback]}>
            <Ionicons name="person" size={24} color={COLORS.border} />
          </View>
        )}
        <View style={styles.trainerInfo}>
          <Text style={styles.trainerName}>{trainerName}</Text>
          {trainer.specialization ? (
            <Text style={styles.trainerSpec}>{trainer.specialization}</Text>
          ) : null}
          {trainer.experience_years > 0 && (
            <Text style={styles.trainerMeta}>{t('course.trainer_experience', { years: trainer.experience_years })}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
      </TouchableOpacity>
      {trainer.short_description ? (
        <Text style={styles.trainerBio}>{trainer.short_description}</Text>
      ) : null}
    </>
  )
}

const MODULE_ICONS = { training: '💪', theory: '🧠', nutrition: '🥗', recovery: '🧘' }

function ModuleItem({ module, trainingVariants, t }) {
  const icon = MODULE_ICONS[module.type] || '📋'
  const label = t(`course.module_${module.type}`) || module.type

  // Training content lives in training_variants (weeks→days→contents), not in module.contents
  if (module.type === 'training') {
    const variants = trainingVariants || []
    return (
      <View style={styles.moduleItem}>
        <View style={styles.moduleHeader}>
          <Text style={styles.moduleIcon}>{icon}</Text>
          <Text style={styles.moduleLabel}>{label}</Text>
          <Text style={styles.moduleCount}>{t('course.training_variants_count', { count: variants.length })}</Text>
        </View>
        {variants.map((v) => (
          <View key={v.id} style={styles.contentRow}>
            <Text style={styles.contentIcon}>📅</Text>
            <Text style={styles.contentTitle} numberOfLines={1}>
              {v.name || `Вариант ${v.variant_number}`}
            </Text>
          </View>
        ))}
        {variants.length === 0 && (
          <Text style={[styles.contentTitle, { paddingLeft: 26 }]}>
            {t('course.after_purchase')}
          </Text>
        )}
      </View>
    )
  }

  return (
    <View style={styles.moduleItem}>
      <View style={styles.moduleHeader}>
        <Text style={styles.moduleIcon}>{icon}</Text>
        <Text style={styles.moduleLabel}>{label}</Text>
        <Text style={styles.moduleCount}>{t('course.materials_count', { count: module.contents?.length || 0 })}</Text>
      </View>
      {module.contents?.length > 0 ? module.contents.map((content) => (
        <View key={content.id} style={styles.contentRow}>
          <Text style={styles.contentIcon}>
            {content.content_type === 'video' ? '🎥' : content.content_type === 'pdf' ? '📄' : '🖼️'}
          </Text>
          <Text style={styles.contentTitle} numberOfLines={1}>{content.title}</Text>
          {content.is_preview && content.content_type === 'video' && (
            <View style={styles.previewBadge}>
              <Text style={styles.previewText}>{t('course.preview_badge')}</Text>
            </View>
          )}
        </View>
      )) : (
        <Text style={[styles.contentTitle, { paddingLeft: 26 }]}>
          {t('course.materials_after_purchase')}
        </Text>
      )}
    </View>
  )
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: COLORS.background },
  errorText: { color: COLORS.textSecondary, fontSize: 16, textAlign: 'center' },
  backBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  backBtnText: { color: COLORS.white, fontWeight: '700' },

  coverContainer: { position: 'relative', height: 300 },
  cover: { width: '100%', height: '100%' },
  coverPlaceholder: { backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  navBtn: {
    position: 'absolute', left: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  favBtn: {
    position: 'absolute', right: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  coverTitle: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
  },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.white, marginBottom: 6, lineHeight: 26 },
  shortDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 8, lineHeight: 18 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stars: { color: '#FBBF24', fontSize: 14 },
  ratingText: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },

  body: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },

  priceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  price: { fontSize: 20, fontWeight: '800', color: COLORS.header },
  purchasedBadge: { fontSize: 12, color: '#10B981', fontWeight: '600', marginTop: 2 },
  actionBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  actionBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  badgeLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '500' },
  badgeValue: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 2 },

  sectionCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    gap: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 4 },
  statIcon: { fontSize: 24 },
  statValue: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary },

  trainerRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  trainerPhoto: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.lightGray },
  trainerPhotoFallback: { justifyContent: 'center', alignItems: 'center' },
  trainerInfo: { flex: 1 },
  trainerName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  trainerSpec: { fontSize: 13, color: COLORS.primary, marginTop: 2 },
  trainerMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  trainerBio: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  moduleItem: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, gap: 6 },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  moduleIcon: { fontSize: 18 },
  moduleLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },
  moduleCount: { fontSize: 12, color: COLORS.textSecondary },
  contentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 26 },
  contentIcon: { fontSize: 14 },
  contentTitle: { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  previewBadge: { backgroundColor: '#EEF0FB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  previewText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  bodyText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
})
