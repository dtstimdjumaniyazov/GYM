import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, Image, ActivityIndicator, Linking,
} from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { logout, loadProfile } from '../../src/store/authSlice'
import { COLORS } from '../../src/constants/colors'
import { ENDPOINTS } from '../../src/constants/api'
import api from '../../src/services/api'
import { i18n } from '../../src/i18n'
import { storage } from '../../src/services/storage'

export default function ProfileScreen() {
  const { user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const [dashboard, setDashboard] = useState(null)

  useFocusEffect(useCallback(() => {
    dispatch(loadProfile())
    if (user?.role === 'trainer') {
      api.get(ENDPOINTS.TRAINER_DASHBOARD)
        .then(({ data }) => setDashboard(data))
        .catch(() => {})
    }
  }, [dispatch, user?.role]))

  const handleLogout = () => {
    Alert.alert(t('profile.logout_title'), t('profile.logout_confirm'), [
      { text: t('profile.logout_cancel'), style: 'cancel' },
      {
        text: t('profile.logout_confirm_btn'),
        style: 'destructive',
        onPress: async () => {
          await dispatch(logout())
          router.replace('/auth/login')
        },
      },
    ])
  }

  const handleChangeLanguage = async (lang) => {
    await i18n.changeLanguage(lang)
    await storage.setLanguage(lang)
  }

  if (!user) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  const isTrainer = user.role === 'trainer'
  const trainer = user.trainer_profile
  const initials = [user.first_name?.[0], user.last_name?.[0]].filter(Boolean).join('') || '?'
  const photoUrl = isTrainer ? (trainer?.photo_url || user.avatar_url) : user.avatar_url
  const currentLang = i18n.language

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.headerBg, { paddingTop: insets.top + 24 }]}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>
          {user.first_name || user.last_name
            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
            : t('profile.no_name')}
        </Text>
        <Text style={styles.phone}>{user.phone}</Text>

        <View style={styles.roleBadgeRow}>
          <View style={[styles.roleBadge, isTrainer && styles.roleBadgeTrainer]}>
            <Ionicons
              name={isTrainer ? 'fitness-outline' : 'person-outline'}
              size={13} color={COLORS.white}
            />
            <Text style={styles.roleBadgeText}>
              {isTrainer ? t('profile.role_trainer') : t('profile.role_student')}
            </Text>
          </View>
          {isTrainer && trainer?.is_verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.verifiedText}>{t('profile.verified')}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.body}>
        {isTrainer
          ? <TrainerSection trainer={trainer} dashboard={dashboard} />
          : <StudentSection user={user} />
        }

        {/* Language Switcher */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.language_label')}</Text>
          <View style={styles.langCard}>
            <TouchableOpacity
              style={[styles.langChip, currentLang === 'ru' && styles.langChipActive]}
              onPress={() => handleChangeLanguage('ru')}
            >
              <Text style={[styles.langChipText, currentLang === 'ru' && styles.langChipTextActive]}>
                {t('profile.lang_ru')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langChip, currentLang === 'uz' && styles.langChipActive]}
              onPress={() => handleChangeLanguage('uz')}
            >
              <Text style={[styles.langChipText, currentLang === 'uz' && styles.langChipTextActive]}>
                {t('profile.lang_uz')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.menu_title')}</Text>
          <View style={styles.menuCard}>
            {isTrainer ? (
              <MenuItem
                icon="stats-chart-outline"
                label={t('profile.my_courses')}
                onPress={() => router.push('/(tabs)/my-courses')}
              />
            ) : (
              <>
                <MenuItem
                  icon="book-outline"
                  label={t('profile.my_courses')}
                  onPress={() => router.push('/(tabs)/my-courses')}
                />
                <MenuItem
                  icon="heart-outline"
                  label={t('profile.favorites')}
                  onPress={() => router.push('/favorites')}
                  last
                />
              </>
            )}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

/* ─── Trainer Section ──────────────────────────────────── */

function TrainerSection({ trainer, dashboard }) {
  const { t } = useTranslation()
  if (!trainer) return null

  const infoItems = [
    trainer.specialization && { icon: 'barbell-outline', label: t('profile.specialization'), value: trainer.specialization },
    trainer.experience_years != null && { icon: 'time-outline', label: t('profile.experience'), value: t('profile.experience_value', { years: trainer.experience_years }) },
  ].filter(Boolean)

  return (
    <>
      {/* Dashboard */}
      {dashboard && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.trainer_section_dashboard')}</Text>
          <View style={styles.dashGrid}>
            <DashCard icon="book-outline" value={dashboard.total_courses} label={t('profile.dashboard_courses')} color={COLORS.primary} />
            <DashCard icon="people-outline" value={dashboard.total_students} label={t('profile.dashboard_students')} color="#8B5CF6" />
            <DashCard icon="pulse-outline" value={dashboard.active_students} label={t('profile.dashboard_active')} color="#10B981" />
            <DashCard
              icon="cash-outline"
              value={Number(dashboard.total_revenue || 0).toLocaleString('ru-RU')}
              label={t('profile.dashboard_revenue')}
              color="#F59E0B"
              small
            />
          </View>
        </View>
      )}

      {/* Info */}
      {infoItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.trainer_section_info')}</Text>
          <View style={styles.infoCard}>
            {infoItems.map((item, i) => (
              <InfoRow key={i} icon={item.icon} label={item.label} value={item.value} last={i === infoItems.length - 1} />
            ))}
          </View>
        </View>
      )}

      {trainer.short_description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.trainer_section_desc')}</Text>
          <View style={styles.bioCard}>
            <Text style={styles.bioText}>{trainer.short_description}</Text>
          </View>
        </View>
      ) : null}

      {trainer.instagram_url ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.trainer_section_social')}</Text>
          <View style={styles.infoCard}>
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => Linking.openURL(trainer.instagram_url)}
            >
              <View style={styles.infoIconWrap}>
                <Ionicons name="logo-instagram" size={18} color={COLORS.primary} />
              </View>
              <Text style={[styles.infoValue, { color: COLORS.primary }]}>Instagram</Text>
              <Ionicons name="open-outline" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </>
  )
}

function DashCard({ icon, value, label, color, small }) {
  return (
    <View style={[styles.dashCard, { borderTopColor: color }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.dashValue, small && styles.dashValueSmall]} numberOfLines={1}>{value}</Text>
      <Text style={styles.dashLabel}>{label}</Text>
    </View>
  )
}

/* ─── Student Section ──────────────────────────────────── */

function StudentSection({ user }) {
  const { t } = useTranslation()
  const GENDER_LABELS = { male: t('profile.gender_male'), female: t('profile.gender_female') }

  const items = [
    user.age && { icon: 'calendar-outline', label: t('profile.age'), value: t('profile.age_value', { age: user.age }) },
    user.gender && { icon: 'person-outline', label: t('profile.gender'), value: GENDER_LABELS[user.gender] || user.gender },
    user.weight && { icon: 'scale-outline', label: t('profile.weight'), value: t('profile.weight_value', { weight: user.weight }) },
  ].filter(Boolean)

  if (items.length === 0) return null

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('profile.student_section_personal')}</Text>
      <View style={styles.infoCard}>
        {items.map((item, i) => (
          <InfoRow key={i} icon={item.icon} label={item.label} value={item.value} last={i === items.length - 1} />
        ))}
      </View>
    </View>
  )
}

/* ─── Info Row ─────────────────────────────────────────── */

function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

/* ─── Menu Item ────────────────────────────────────────── */

function MenuItem({ icon, label, onPress, last }) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, !last && styles.menuItemBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
    </TouchableOpacity>
  )
}

/* ─── Styles ───────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerBg: {
    backgroundColor: COLORS.header,
    alignItems: 'center',
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatarWrap: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 14, overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: {
    width: '100%', height: '100%',
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 34, color: COLORS.white, fontWeight: '700' },

  name: { fontSize: 20, fontWeight: '700', color: COLORS.white, marginBottom: 4 },
  phone: { fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 12 },

  roleBadgeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  roleBadgeTrainer: { backgroundColor: 'rgba(83,101,202,0.5)' },
  roleBadgeText: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  verifiedText: { fontSize: 12, fontWeight: '600', color: '#10B981' },

  body: { padding: 16, gap: 4 },

  section: { marginTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, paddingHorizontal: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  langCard: {
    flexDirection: 'row', gap: 10,
    backgroundColor: COLORS.white, borderRadius: 16, padding: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  langChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.lightGray,
  },
  langChipActive: { backgroundColor: COLORS.primary },
  langChipText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  langChipTextActive: { color: COLORS.white },

  infoCard: {
    backgroundColor: COLORS.white, borderRadius: 16,
    overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoIconWrap: { width: 32, alignItems: 'center' },
  infoLabel: { flex: 1, fontSize: 14, color: COLORS.text },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },

  bioCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  bioText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },

  dashGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dashCard: {
    flex: 1, minWidth: '44%',
    backgroundColor: COLORS.white, borderRadius: 14, padding: 14,
    borderTopWidth: 3, alignItems: 'center', gap: 4,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  dashValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  dashValueSmall: { fontSize: 15 },
  dashLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },

  menuCard: {
    backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: COLORS.text },

  logoutBtn: {
    marginTop: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 16,
    borderWidth: 1.5, borderColor: COLORS.error,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: COLORS.error },
})
