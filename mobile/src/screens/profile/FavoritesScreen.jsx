import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native'
import { useGetFavoritesQuery } from '../../api/coursesApi'
import { COLORS } from '../../theme'

export default function FavoritesScreen({ navigation }) {
  const { data: courses = [], isLoading } = useGetFavoritesQuery()

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.accent} size="large" /></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Избранное</Text>
      </View>
      <FlatList
        data={courses}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CourseDetail', { id: item.id })}
          >
            {item.cover_url ? (
              <Image source={{ uri: item.cover_url }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]} />
            )}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.cardPrice}>{Number(item.price).toLocaleString()} сум</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Нет избранных курсов</Text>
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
  cardPrice: { color: COLORS.accent, fontSize: 14, fontWeight: '700', marginTop: 6 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 60, fontSize: 15 },
})
