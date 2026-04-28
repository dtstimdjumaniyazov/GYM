import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useGetCourseQuery, useToggleFavoriteMutation } from '../../api/coursesApi'
import { COLORS } from '../../theme'

export default function CourseDetailScreen({ route, navigation }) {
  const { id } = route.params
  const { data: course, isLoading } = useGetCourseQuery(id)
  const [toggleFavorite] = useToggleFavoriteMutation()

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    )
  }

  if (!course) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Курс не найден</Text>
      </View>
    )
  }

  const isEnrolled = course.is_enrolled
  const isFavorited = course.is_favorited

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header image */}
        {course.cover_url ? (
          <Image source={{ uri: course.cover_url }} style={styles.cover} />
        ) : (
          <View style={styles.coverPlaceholder} />
        )}

        {/* Back + Favorite */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => toggleFavorite(id)}>
            <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={22} color={isFavorited ? '#f43f5e' : '#fff'} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{course.title}</Text>
          <Text style={styles.trainer}>
            {course.trainer?.full_name || course.trainer?.phone}
          </Text>

          <View style={styles.meta}>
            <MetaBadge icon="time-outline" label={`${course.duration_weeks} нед.`} />
            <MetaBadge icon="bar-chart-outline" label={course.level_display || course.level} />
            <MetaBadge icon="people-outline" label={`${course.purchases_count} учеников`} />
          </View>

          <Text style={styles.sectionTitle}>О курсе</Text>
          <Text style={styles.desc}>{course.short_description}</Text>

          {course.goals_text ? (
            <>
              <Text style={styles.sectionTitle}>Цель</Text>
              <Text style={styles.desc}>{course.goals_text}</Text>
            </>
          ) : null}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.cta}>
        {isEnrolled ? (
          <TouchableOpacity
            style={[styles.btn, styles.btnGreen]}
            onPress={() => navigation.navigate('Lessons', { id })}
          >
            <Text style={styles.btnText}>Перейти к урокам</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.ctaRow}>
            <Text style={styles.price}>{Number(course.price).toLocaleString()} сум</Text>
            <TouchableOpacity style={styles.btn}>
              <Text style={styles.btnText}>Купить курс</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

function MetaBadge({ icon, label }) {
  return (
    <View style={metaStyles.badge}>
      <Ionicons name={icon} size={14} color={COLORS.accent} />
      <Text style={metaStyles.label}>{label}</Text>
    </View>
  )
}

const metaStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: { color: COLORS.textSecondary, fontSize: 12 },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: COLORS.textMuted, fontSize: 16 },
  cover: { width: '100%', height: 240 },
  coverPlaceholder: { width: '100%', height: 240, backgroundColor: COLORS.bgHeader },
  topBar: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  trainer: { fontSize: 14, color: COLORS.textMuted, marginBottom: 16 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 4 },
  desc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  cta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bgHeader,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 16,
    paddingBottom: 32,
  },
  ctaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 20, fontWeight: '700', color: COLORS.accent },
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  btnGreen: { backgroundColor: '#16a34a', flex: 1 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
