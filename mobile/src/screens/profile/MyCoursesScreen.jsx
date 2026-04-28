import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native'
import { useGetEnrollmentsQuery } from '../../api/coursesApi'
import { COLORS } from '../../theme'

export default function MyCoursesScreen({ navigation }) {
  const { data: enrollments = [], isLoading } = useGetEnrollmentsQuery()

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.accent} size="large" /></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Мои курсы</Text>
      </View>
      <FlatList
        data={enrollments}
        keyExtractor={(e) => e.course_id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Lessons', { id: item.course_id })}
          >
            {item.cover_url ? (
              <Image source={{ uri: item.cover_url }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]} />
            )}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardSub}>{item.trainer_name}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Вы ещё не купили ни одного курса</Text>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cover: { width: 90, height: 90 },
  coverPlaceholder: { backgroundColor: COLORS.bgHeader },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center' },
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  cardSub: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 60, fontSize: 15 },
})
