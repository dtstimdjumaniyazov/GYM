import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native'
import { useState } from 'react'
import { useGetCoursesQuery, useGetCategoriesQuery } from '../../api/coursesApi'
import { COLORS } from '../../theme'

export default function CatalogScreen({ navigation }) {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState(null)

  const { data: categories = [] } = useGetCategoriesQuery()
  const { data: courses = [], isLoading } = useGetCoursesQuery(
    categoryId ? { category: categoryId } : {}
  )

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>FitEvolution</Text>
      </View>

      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Поиск курсов..."
        placeholderTextColor={COLORS.textMuted}
      />

      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(c) => c.id}
        style={styles.categories}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.catBtn, categoryId === item.id && styles.catBtnActive]}
            onPress={() => setCategoryId(categoryId === item.id ? null : item.id)}
          >
            <Text style={[styles.catText, categoryId === item.id && styles.catTextActive]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        )}
      />

      {isLoading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
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
                <Text style={styles.cardTrainer} numberOfLines={1}>
                  {item.trainer_name}
                </Text>
                <Text style={styles.cardPrice}>
                  {Number(item.price).toLocaleString()} сум
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Курсы не найдены</Text>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 },
  logo: { fontSize: 20, fontWeight: '800', color: COLORS.accent },
  search: {
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
    marginBottom: 12,
  },
  categories: { maxHeight: 44, marginBottom: 12 },
  catBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  catText: { color: COLORS.textMuted, fontSize: 13 },
  catTextActive: { color: '#fff', fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cover: { width: 100, height: 100 },
  coverPlaceholder: { backgroundColor: COLORS.bgHeader },
  cardBody: { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  cardTrainer: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  cardPrice: { color: COLORS.accent, fontSize: 14, fontWeight: '700', marginTop: 6 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40, fontSize: 15 },
})
