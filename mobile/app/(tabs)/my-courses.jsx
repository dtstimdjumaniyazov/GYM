import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, SectionList, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSelector } from 'react-redux'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { COLORS } from '../../src/constants/colors'
import { ENDPOINTS } from '../../src/constants/api'
import api from '../../src/services/api'

export default function MyCoursesScreen() {
  const { user } = useSelector((s) => s.auth)
  const isTrainer = user?.role === 'trainer'

  return isTrainer ? <TrainerCoursesScreen /> : <StudentCoursesScreen />
}

/* ═══════════════════════════════════════════════════════════
   УЧЕНИК — купленные курсы
═══════════════════════════════════════════════════════════ */

function StudentCoursesScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const [enrollments, setEnrollments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isFetchingMore, setIsFetchingMore] = useState(false)

  const load = useCallback(async (pageNum = 1, refresh = false) => {
    if (pageNum === 1) refresh ? setIsRefreshing(true) : setIsLoading(true)
    else setIsFetchingMore(true)
    try {
      const { data } = await api.get(`${ENDPOINTS.ENROLLMENTS}?page=${pageNum}`)
      const results = data.results || data
      setEnrollments((prev) => pageNum === 1 ? results : [...prev, ...results])
      setHasMore(!!data.next)
      setPage(pageNum)
    } catch { /* silent */ }
    finally {
      setIsLoading(false); setIsRefreshing(false); setIsFetchingMore(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load(1) }, [load]))

  const inProgress = enrollments.filter((e) => e.progress_percent < 100)
  const finished = enrollments.filter((e) => e.progress_percent >= 100)
  const sections = [
    inProgress.length > 0 && { title: t('my_courses.in_progress'), data: inProgress },
    finished.length > 0 && { title: t('my_courses.finished'), data: finished },
  ].filter(Boolean)

  if (isLoading) return <Loader insets={insets} />

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title={t('my_courses.title')} count={enrollments.length} />
      {enrollments.length === 0 ? (
        <EmptyState
          icon="📚"
          title={t('my_courses.no_courses')}
          desc={t('my_courses.no_courses_desc')}
          btnLabel={t('my_courses.go_catalog')}
          onPress={() => router.push('/(tabs)/catalog')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => load(1, true)} tintColor={COLORS.primary} />}
          onEndReached={() => hasMore && !isFetchingMore && load(page + 1)}
          onEndReachedThreshold={0.3}
          renderSectionHeader={({ section }) => <SectionHeader title={section.title} count={section.data.length} />}
          renderItem={({ item }) => (
            <EnrollmentCard enrollment={item} onPress={() => router.push(`/course/${item.course_id}/lessons`)} />
          )}
          ListFooterComponent={isFetchingMore ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} /> : null}
        />
      )}
    </View>
  )
}

/* ═══════════════════════════════════════════════════════════
   ТРЕНЕР — его курсы
═══════════════════════════════════════════════════════════ */

const STATUS_COLORS = {
  draft: '#6B7280',
  pending_review: '#F59E0B',
  published: '#10B981',
  revision_required: '#EF4444',
}

function TrainerCoursesScreen() {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const load = useCallback(async (refresh = false) => {
    refresh ? setIsRefreshing(true) : setIsLoading(true)
    try {
      const { data } = await api.get(ENDPOINTS.TRAINER_COURSES)
      setCourses(data)
    } catch { /* silent */ }
    finally { setIsLoading(false); setIsRefreshing(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const published = courses.filter((c) => c.status === 'published')
  const draft = courses.filter((c) => c.status === 'draft')
  const review = courses.filter((c) => c.status === 'pending_review')
  const revision = courses.filter((c) => c.status === 'revision_required')

  const sections = [
    revision.length > 0 && { title: t('my_courses.section_revision'), data: revision },
    review.length > 0 && { title: t('my_courses.section_review'), data: review },
    published.length > 0 && { title: t('my_courses.section_published'), data: published },
    draft.length > 0 && { title: t('my_courses.section_draft'), data: draft },
  ].filter(Boolean)

  if (isLoading) return <Loader insets={insets} />

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title={t('my_courses.title')} count={courses.length} />
      {courses.length === 0 ? (
        <EmptyState
          icon="🏋️"
          title={t('my_courses.no_trainer_courses')}
          desc={t('my_courses.no_trainer_courses_desc')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
          renderSectionHeader={({ section }) => <SectionHeader title={section.title} count={section.data.length} />}
          renderItem={({ item }) => <TrainerCourseCard course={item} />}
        />
      )}
    </View>
  )
}

/* ─── Enrollment Card (ученик) ─────────────────────────── */

function EnrollmentCard({ enrollment, onPress }) {
  const { t } = useTranslation()
  const { course_title, course_cover_url, trainer_name, progress_percent, completed_lessons, total_lessons } = enrollment
  const isFinished = progress_percent >= 100

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {course_cover_url
        ? <Image source={{ uri: course_cover_url }} style={styles.cover} resizeMode="cover" />
        : <View style={[styles.cover, styles.coverPlaceholder]}><Ionicons name="barbell-outline" size={32} color={COLORS.textSecondary} /></View>
      }
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{course_title}</Text>
        <Text style={styles.cardTrainer} numberOfLines={1}>{trainer_name}</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min(progress_percent, 100)}%` }, isFinished && styles.progressBarDone]} />
          </View>
          <Text style={[styles.progressText, isFinished && styles.progressTextDone]}>{progress_percent}%</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.lessonsText}>{completed_lessons} / {total_lessons} {t('my_courses.lessons')}</Text>
          {isFinished
            ? <View style={styles.finishedBadge}><Text style={styles.finishedText}>{t('my_courses.completed_badge')}</Text></View>
            : <View style={styles.continueBadge}><Ionicons name="play" size={11} color={COLORS.white} /><Text style={styles.continueText}>{t('my_courses.continue')}</Text></View>
          }
        </View>
      </View>
    </TouchableOpacity>
  )
}

/* ─── Trainer Course Card ───────────────────────────────── */

function TrainerCourseCard({ course }) {
  const { t } = useTranslation()
  const statusColor = STATUS_COLORS[course.status] || COLORS.textSecondary
  const statusLabel = t(`my_courses.status_${course.status}`) || course.status

  const price = Number(course.price || 0).toLocaleString('ru-RU')

  return (
    <View style={styles.trainerCard}>
      <View style={styles.trainerCardHeader}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
        <Text style={styles.categoryLabel}>{course.category_name}</Text>
      </View>
      <Text style={styles.trainerCardTitle}>{course.title}</Text>
      {course.status === 'revision_required' && course.revision_notes ? (
        <View style={styles.revisionBox}>
          <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
          <Text style={styles.revisionText} numberOfLines={3}>{course.revision_notes}</Text>
        </View>
      ) : null}
      <View style={styles.trainerCardFooter}>
        <View style={styles.trainerStat}>
          <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.trainerStatText}>{course.purchases_count} {t('my_courses.students_abbr')}</Text>
        </View>
        <View style={styles.trainerStat}>
          <Ionicons name="pricetag-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.trainerStatText}>{price} {t('my_courses.sum')}</Text>
        </View>
      </View>
    </View>
  )
}

/* ─── Shared helpers ────────────────────────────────────── */

function Loader({ insets }) {
  return (
    <View style={[styles.centered, { paddingTop: insets.top }]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  )
}

function ScreenHeader({ title, count }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {count > 0 && (
        <Text style={styles.headerCount}>{count}</Text>
      )}
    </View>
  )
}

function SectionHeader({ title, count }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionBadgeText}>{count}</Text>
      </View>
    </View>
  )
}

function EmptyState({ icon, title, desc, btnLabel, onPress }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDesc}>{desc}</Text>
      {btnLabel && onPress && (
        <TouchableOpacity style={styles.catalogBtn} onPress={onPress}>
          <Text style={styles.catalogBtnText}>{btnLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

/* ─── Styles ────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  headerCount: {
    backgroundColor: COLORS.primary, color: COLORS.white,
    fontSize: 13, fontWeight: '700',
    paddingHorizontal: 9, paddingVertical: 2, borderRadius: 12, overflow: 'hidden',
  },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sectionBadge: { backgroundColor: COLORS.lightGray, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sectionBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  catalogBtn: { marginTop: 8, backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 },
  catalogBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

  // Enrollment card
  card: {
    backgroundColor: COLORS.white, borderRadius: 18,
    overflow: 'hidden', flexDirection: 'row', marginBottom: 14,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
  },
  cover: { width: 110, height: 130 },
  coverPlaceholder: { backgroundColor: COLORS.lightGray, justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, padding: 14, justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 20 },
  cardTrainer: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  progressBarBg: { flex: 1, height: 6, backgroundColor: COLORS.lightGray, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressBarDone: { backgroundColor: COLORS.success },
  progressText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, minWidth: 34, textAlign: 'right' },
  progressTextDone: { color: COLORS.success },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  lessonsText: { fontSize: 11, color: COLORS.textSecondary },
  continueBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  continueText: { fontSize: 11, fontWeight: '700', color: COLORS.white },
  finishedBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  finishedText: { fontSize: 11, fontWeight: '700', color: '#065F46' },

  // Trainer course card
  trainerCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4,
  },
  trainerCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: '700' },
  categoryLabel: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 'auto' },
  trainerCardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 21, marginBottom: 10 },
  revisionBox: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 10,
  },
  revisionText: { flex: 1, fontSize: 12, color: '#991B1B', lineHeight: 17 },
  trainerCardFooter: { flexDirection: 'row', gap: 16 },
  trainerStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trainerStatText: { fontSize: 12, color: COLORS.textSecondary },
})
