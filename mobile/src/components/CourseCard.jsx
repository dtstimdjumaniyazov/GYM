import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { COLORS } from '../constants/colors'

const LEVEL_COLORS = { beginner: '#10B981', intermediate: '#F59E0B', advanced: '#EF4444' }
const LANG_LABELS = { ru: 'Рус', uz: 'Узб', en: 'Eng' }

export default function CourseCard({ course }) {
  const router = useRouter()
  const { t } = useTranslation()
  const price = Number(course.price).toLocaleString('ru-RU')

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
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/course/${course.id}`)}
      activeOpacity={0.85}
    >
      {/* Cover */}
      <View style={styles.coverContainer}>
        {course.cover_url ? (
          <Image source={{ uri: course.cover_url }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="barbell-outline" size={36} color={COLORS.border} />
          </View>
        )}
        <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[course.level] || COLORS.primary }]}>
          <Text style={styles.levelText}>{LEVEL_LABELS[course.level] || course.level}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{course.title}</Text>

        {/* Tags */}
        <View style={styles.tags}>
          <Tag icon="location-outline" label={FORMAT_LABELS[course.format] || course.format} />
          <Tag icon="language-outline" label={LANG_LABELS[course.language] || course.language} />
          {course.variants_count > 1 && (
            <Tag icon="git-branch-outline" label={t('course_card.variants', { count: course.variants_count })} />
          )}
        </View>

        {/* Students */}
        {course.purchases_count != null && (
          <Text style={styles.students}>{t('course_card.students', { count: course.purchases_count })}</Text>
        )}

        {/* Price */}
        <Text style={styles.price}>{price} UZS</Text>
      </View>
    </TouchableOpacity>
  )
}

function Tag({ icon, label }) {
  return (
    <View style={styles.tag}>
      <Ionicons name={icon} size={12} color={COLORS.primary} />
      <Text style={styles.tagText}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  coverContainer: { position: 'relative', height: 160 },
  cover: { width: '100%', height: '100%' },
  coverPlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center', alignItems: 'center',
  },
  levelBadge: {
    position: 'absolute', top: 10, left: 10,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  levelText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },

  info: { padding: 14 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10, lineHeight: 20 },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EEF0FB', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  tagText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  students: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },

  price: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
})
