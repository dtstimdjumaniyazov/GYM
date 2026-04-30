import { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { COLORS } from '../../src/constants/colors'
import { useCategories } from '../../src/hooks/useCategories'
import { useCourses } from '../../src/hooks/useCourses'
import CourseCard from '../../src/components/CourseCard'

export default function CatalogScreen() {
  const insets = useSafeAreaInsets()
  const { category: initialCategory } = useLocalSearchParams()
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || '')
  const debounceRef = useRef(null)

  useEffect(() => {
    setSelectedCategory(initialCategory || '')
  }, [initialCategory])

  const { categories } = useCategories()
  const { courses, isLoading, isRefreshing, hasMore, loadMore, refresh } = useCourses({
    category: selectedCategory,
    search: searchQuery,
  })

  const handleSearchChange = (text) => {
    setSearch(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearchQuery(text), 500)
  }

  const handleSearchClear = () => {
    setSearch('')
    setSearchQuery('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }

  const handleCategorySelect = (id) => {
    setSelectedCategory(id === selectedCategory ? '' : id)
  }

  const renderFooter = () => {
    if (!hasMore) return null
    return <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
  }

  const renderEmpty = () => {
    if (isLoading) return null
    return (
      <View style={styles.empty}>
        <Ionicons name="search-outline" size={48} color={COLORS.border} />
        <Text style={styles.emptyText}>{t('catalog.not_found')}</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('catalog.title')}</Text>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('catalog.search_placeholder')}
              placeholderTextColor={COLORS.textSecondary}
              value={search}
              onChangeText={handleSearchChange}
              onSubmitEditing={() => setSearchQuery(search)}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={handleSearchClear}>
                <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          <TouchableOpacity
            style={[styles.chip, selectedCategory === '' && styles.chipActive]}
            onPress={() => setSelectedCategory('')}
          >
            <Text style={[styles.chipText, selectedCategory === '' && styles.chipTextActive]}>{t('catalog.all')}</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, selectedCategory === cat.id && styles.chipActive]}
              onPress={() => handleCategorySelect(cat.id)}
            >
              <Text style={[styles.chipText, selectedCategory === cat.id && styles.chipTextActive]}>
                {cat.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Courses list */}
      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CourseCard course={item} />}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          onRefresh={refresh}
          refreshing={isRefreshing}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 12 },

  searchRow: { marginBottom: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.lightGray, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, padding: 0 },

  categoriesRow: { gap: 8, paddingBottom: 8, paddingRight: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: COLORS.lightGray,
  },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },

  list: { padding: 16 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: COLORS.textSecondary, fontSize: 16 },
})
