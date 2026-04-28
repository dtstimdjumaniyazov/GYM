import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { useDispatch, useSelector } from 'react-redux'
import { Ionicons } from '@expo/vector-icons'
import { useGetMeQuery } from '../../api/authApi'
import { logout } from '../../store/authSlice'
import { baseApi } from '../../api/baseApi'
import { COLORS } from '../../theme'

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch()
  const { data: user } = useGetMeQuery()

  async function handleLogout() {
    await SecureStore.deleteItemAsync('access_token')
    await SecureStore.deleteItemAsync('refresh_token')
    dispatch(baseApi.util.resetApiState())
    dispatch(logout())
  }

  const isTrainer = !!user?.trainer_profile?.id

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Профиль</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.full_name || user?.phone || '?')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.full_name || 'Без имени'}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        {isTrainer && (
          <View style={styles.trainerBadge}>
            <Text style={styles.trainerBadgeText}>Тренер</Text>
          </View>
        )}
      </View>

      <View style={styles.menu}>
        <MenuItem
          icon="heart-outline"
          label="Избранное"
          onPress={() => navigation.navigate('Favorites')}
        />
        <MenuItem
          icon="notifications-outline"
          label="Уведомления"
          onPress={() => navigation.navigate('Notifications')}
        />
        <MenuItem
          icon="log-out-outline"
          label="Выйти"
          onPress={handleLogout}
          danger
        />
      </View>
    </ScrollView>
  )
}

function MenuItem({ icon, label, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={20} color={danger ? COLORS.error : COLORS.textSecondary} />
      <Text style={[styles.menuLabel, danger && { color: COLORS.error }]}>{label}</Text>
      {!danger && <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 40 },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  card: {
    margin: 16,
    padding: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  name: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  phone: { fontSize: 14, color: COLORS.textMuted },
  trainerBadge: {
    marginTop: 10,
    backgroundColor: COLORS.surfaceActive,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  trainerBadgeText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  menu: {
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.textSecondary },
})
