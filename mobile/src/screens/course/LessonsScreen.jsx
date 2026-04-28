import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useGetCourseLessonsQuery } from '../../api/coursesApi'
import { COLORS } from '../../theme'

export default function LessonsScreen({ route }) {
  const { id } = route.params
  const { data, isLoading } = useGetCourseLessonsQuery(id)

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.accent} size="large" /></View>
  }

  return (
    <View style={styles.center}>
      <Text style={styles.text}>Уроки — в разработке</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  text: { color: COLORS.textMuted, fontSize: 16 },
})
