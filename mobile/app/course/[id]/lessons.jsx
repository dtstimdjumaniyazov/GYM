import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, Image, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Alert, useWindowDimensions, Platform,
} from 'react-native'
import { usePreventScreenCapture } from 'expo-screen-capture'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import WebView from 'react-native-webview'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as ScreenOrientation from 'expo-screen-orientation'
import { useTranslation } from 'react-i18next'
import { COLORS } from '../../../src/constants/colors'
import { ENDPOINTS, API_URL } from '../../../src/constants/api'
import api from '../../../src/services/api'
import { storage } from '../../../src/services/storage'

const buildVimeoHtml = (vimeoId) => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    .wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <div class="wrap">
    <iframe id="vp"
      src="https://player.vimeo.com/video/${vimeoId}?autoplay=1&color=5365CA&title=0&byline=0&portrait=0&like=0&share=0&dnt=1&transparent=0&api=1"
      frameborder="0"
      allow="autoplay; fullscreen; picture-in-picture"
      allowfullscreen
    ></iframe>
  </div>
  <script>
    var iframe = document.getElementById('vp');
    var origin = 'https://player.vimeo.com';
    var lastSent = -1;

    window.addEventListener('message', function(e) {
      if (e.origin !== origin) return;
      var data;
      try { data = JSON.parse(e.data); } catch(ex) { return; }

      if (data.event === 'ready') {
        iframe.contentWindow.postMessage(JSON.stringify({method:'addEventListener', value:'playProgress'}), origin);
        iframe.contentWindow.postMessage(JSON.stringify({method:'addEventListener', value:'finish'}), origin);
      }
      if (data.event === 'playProgress' && data.data) {
        var pct = Math.round((data.data.percent || 0) * 100);
        if (pct !== lastSent) {
          lastSent = pct;
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'progress', percent:pct}));
        }
      }
      if (data.event === 'finish') {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'ended'}));
      }
    });
  </script>
</body>
</html>`

const MODULE_ICONS = { training: '💪', theory: '🧠', nutrition: '🥗', recovery: '🧘', sports_nutrition: '🥤', training_nuances: '📌' }
const MODULE_ORDER = ['training', 'theory', 'nutrition', 'recovery', 'sports_nutrition', 'training_nuances']

const DAY_SHORT_KEYS = { 1: 'day_mon', 2: 'day_tue', 3: 'day_wed', 4: 'day_thu', 5: 'day_fri', 6: 'day_sat', 7: 'day_sun' }
const DAY_FULL_KEYS = { 1: 'day_full_mon', 2: 'day_full_tue', 3: 'day_full_wed', 4: 'day_full_thu', 5: 'day_full_fri', 6: 'day_full_sat', 7: 'day_full_sun' }

export default function LessonsScreen() {
  usePreventScreenCapture()
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { width: winW, height: winH } = useWindowDimensions()
  const { t } = useTranslation()

  const [course, setCourse] = useState(null)
  const [lessonsData, setLessonsData] = useState(null)
  const [trainingData, setTrainingData] = useState(null)
  const [enrollment, setEnrollment] = useState(null)
  const [progressMap, setProgressMap] = useState({})
  const [isLoading, setIsLoading] = useState(true)

  const [activeTab, setActiveTab] = useState(null)
  const [expandedWeeks, setExpandedWeeks] = useState({})
  const [expandedDays, setExpandedDays] = useState({})
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState(null)
  const [settingVariant, setSettingVariant] = useState(false)
  const [activeVideo, setActiveVideo] = useState(null)   // { vimeoId, title, contentId, contentType }
  const [activeFile, setActiveFile] = useState(null)    // { proxyUrl, title, authHeader }
  const latestPercentRef = useRef(0)
  const lastSavedPercentRef = useRef(0)

  // ─── Load data ───────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [courseRes, lessonsRes, trainingRes, enrollmentRes, progressRes] = await Promise.all([
        api.get(ENDPOINTS.COURSE_DETAIL(id)),
        api.get(ENDPOINTS.COURSE_LESSONS(id)),
        api.get(ENDPOINTS.TRAINING_SCHEDULE(id)),
        api.get(ENDPOINTS.ENROLLMENT_DETAIL(id)).catch(() => ({ data: null })),
        api.get(ENDPOINTS.PROGRESS(id)).catch(() => ({ data: [] })),
      ])
      setCourse(courseRes.data)
      setLessonsData(lessonsRes.data)
      setTrainingData(trainingRes.data)
      setEnrollment(enrollmentRes.data)
      const map = {}
      for (const p of progressRes.data || []) map[p.content_id] = p
      setProgressMap(map)
    } catch (e) {
      Alert.alert(t('lessons.error_title'), t('lessons.error_load'))
    } finally {
      setIsLoading(false)
    }
  }, [id, t])

  useEffect(() => { loadAll() }, [loadAll])

  // ─── Sorted modules ───────────────────────────────────────────
  const modules = lessonsData?.modules || []
  const sortedModules = MODULE_ORDER.map((type) => modules.find((m) => m.type === type)).filter(Boolean)
  const currentTab = activeTab || sortedModules[0]?.type
  const currentModule = sortedModules.find((m) => m.type === currentTab)
  const isVariantLocked = enrollment?.variant_locked
  const needsVariantSelection = !isVariantLocked && (course?.training_variants?.length || 0) > 0

  // ─── Progress ────────────────────────────────────────────────
  const updateProgress = useCallback(async (contentId, contentType, percent) => {
    try {
      await api.post(ENDPOINTS.PROGRESS(id), {
        content_id: contentId,
        content_type: contentType,
        watch_percent: percent,
      })
      setProgressMap((prev) => ({
        ...prev,
        [contentId]: { ...prev[contentId], watch_percent: percent, is_completed: percent >= 90 },
      }))
    } catch { /* silent */ }
  }, [id])

  // ─── Variant selection ───────────────────────────────────────
  const handleConfirmVariant = async () => {
    if (!selectedVariantId || settingVariant) return
    setSettingVariant(true)
    try {
      await api.post(ENDPOINTS.SET_VARIANT(id), { variant_id: selectedVariantId })
      setShowConfirmModal(false)
      setShowVariantModal(false)
      // Reload training data after variant locked
      const [trainingRes, enrollmentRes] = await Promise.all([
        api.get(ENDPOINTS.TRAINING_SCHEDULE(id)),
        api.get(ENDPOINTS.ENROLLMENT_DETAIL(id)).catch(() => ({ data: null })),
      ])
      setTrainingData(trainingRes.data)
      setEnrollment(enrollmentRes.data)
    } catch {
      Alert.alert(t('lessons.error_title'), t('lessons.error_variant'))
    } finally {
      setSettingVariant(false)
    }
  }

  const handlePlayVideo = async (content, contentType) => {
    if (!content.vimeo_video?.vimeo_id) return
    const saved = progressMap[content.id]?.watch_percent || 0
    latestPercentRef.current = saved
    lastSavedPercentRef.current = saved
    setActiveVideo({
      vimeoId: content.vimeo_video.vimeo_id,
      title: content.title,
      contentId: content.id,
      contentType,
    })
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
  }

  const handleCloseVideo = async () => {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
    if (activeVideo && latestPercentRef.current > lastSavedPercentRef.current) {
      updateProgress(activeVideo.contentId, activeVideo.contentType, latestPercentRef.current)
    }
    latestPercentRef.current = 0
    lastSavedPercentRef.current = 0
    setActiveVideo(null)
  }

  const handleWebViewMessage = useCallback((event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data)
      if (!activeVideo) return
      if (msg.type === 'progress') {
        const percent = msg.percent
        latestPercentRef.current = percent
        const shouldSave =
          percent - lastSavedPercentRef.current >= 5 ||
          (percent >= 84 && lastSavedPercentRef.current < 84)
        if (shouldSave) {
          lastSavedPercentRef.current = percent
          updateProgress(activeVideo.contentId, activeVideo.contentType, percent)
        }
      }
      if (msg.type === 'ended') {
        latestPercentRef.current = 100
        lastSavedPercentRef.current = 100
        updateProgress(activeVideo.contentId, activeVideo.contentType, 100)
      }
    } catch { /* silent */ }
  }, [activeVideo, updateProgress])

  const handleOpenFile = useCallback(async (content, contentType) => {
    const fileId = content.gdrive_file?.id
    if (!fileId) return

    updateProgress(content.id, contentType, 100)

    const isImage = content.content_type === 'image'

    if (isImage) {
      // Show image in modal viewer
      setActiveFile({ type: 'image', contentId: content.id, contentType, title: content.title, fileId })
      return
    }

    // PDF: download via backend proxy and open with native viewer
    setActiveFile({ type: 'loading', title: content.title })
    try {
      const token = await storage.getAccessToken()
      const proxyUrl = `${API_URL}/storage/gdrive/${fileId}/view/`
      const mimeType = content.gdrive_file?.mime_type || 'application/pdf'
      const ext = mimeType === 'application/pdf' ? 'pdf' : mimeType.split('/')[1] || 'bin'
      const localUri = FileSystem.cacheDirectory + `${fileId}.${ext}`

      const { uri } = await FileSystem.downloadAsync(proxyUrl, localUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      setActiveFile(null)

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType, dialogTitle: content.title })
      } else {
        Alert.alert(t('lessons.error_title'), t('lessons.error_file_device'))
      }
    } catch (e) {
      setActiveFile(null)
      Alert.alert(t('lessons.error_title'), t('lessons.error_file_load'))
    }
  }, [updateProgress, t])

  // ─── Render ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t('lessons.loading')}</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{course?.title}</Text>
        {!isVariantLocked && (course?.training_variants?.length || 0) > 0 && (
          <TouchableOpacity onPress={() => setShowVariantModal(true)} style={styles.variantBtn}>
            <Ionicons name="list-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      {sortedModules.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsRow}
        >
          {sortedModules.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={[styles.tab, currentTab === module.type && styles.tabActive]}
              onPress={() => setActiveTab(module.type)}
            >
              <Text style={styles.tabIcon}>{MODULE_ICONS[module.type]}</Text>
              <Text style={[styles.tabText, currentTab === module.type && styles.tabTextActive]}>
                {t(`lessons.module_${module.type}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Tab Content */}
      <View style={styles.content}>
        {currentTab === 'training' ? (
          <TrainingTab
            trainingData={trainingData}
            needsVariantSelection={needsVariantSelection}
            isVariantLocked={isVariantLocked}
            expandedWeeks={expandedWeeks}
            expandedDays={expandedDays}
            progressMap={progressMap}
            activeVideo={activeVideo}
            onToggleWeek={(weekId) => setExpandedWeeks((p) => ({ ...p, [weekId]: !p[weekId] }))}
            onToggleDay={(dayId) => setExpandedDays((p) => ({ ...p, [dayId]: !p[dayId] }))}
            onSelectVariant={() => setShowVariantModal(true)}
            onPlayVideo={(c) => handlePlayVideo(c, 'day_content')}
            onOpenFile={(c) => handleOpenFile(c, 'day_content')}
            t={t}
          />
        ) : currentModule ? (
          <ModuleTab
            module={currentModule}
            progressMap={progressMap}
            activeVideo={activeVideo}
            onPlayVideo={(c) => handlePlayVideo(c, 'module_content')}
            onOpenFile={(c) => handleOpenFile(c, 'module_content')}
            t={t}
          />
        ) : (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>{t('lessons.select_section')}</Text>
          </View>
        )}
      </View>

      {/* Variant Selection Modal */}
      <Modal visible={showVariantModal} animationType="slide" transparent onRequestClose={() => setShowVariantModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t('lessons.variant_modal_title')}</Text>
            <Text style={styles.modalSubtitle}>{t('lessons.variant_modal_subtitle')}</Text>
            <Text style={styles.modalWarning}>{t('lessons.variant_modal_warning')}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {(course?.training_variants || []).map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={styles.variantOption}
                  onPress={() => { setSelectedVariantId(v.id); setShowConfirmModal(true) }}
                >
                  <Text style={styles.variantOptionName}>{v.name || `Вариант ${v.variant_number}`}</Text>
                  {v.description ? <Text style={styles.variantOptionDesc}>{v.description}</Text> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowVariantModal(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>{t('lessons.variant_cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirm Modal */}
      <Modal visible={showConfirmModal} animationType="fade" transparent onRequestClose={() => setShowConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t('lessons.confirm_title')}</Text>
            <Text style={styles.modalSubtitle}>{t('lessons.confirm_subtitle')}</Text>
            <Text style={styles.confirmVariantName}>
              «{course?.training_variants?.find((v) => v.id === selectedVariantId)?.name}»
            </Text>
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>{t('lessons.confirm_warning')}</Text>
            </View>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnYes]}
                onPress={handleConfirmVariant}
                disabled={settingVariant}
              >
                {settingVariant
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.confirmBtnYesText}>{t('lessons.confirm_yes')}</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnNo]}
                onPress={() => { setShowConfirmModal(false); setSelectedVariantId(null) }}
                disabled={settingVariant}
              >
                <Text style={styles.confirmBtnNoText}>{t('lessons.confirm_no')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={!!activeFile && activeFile.type === 'image'}
        animationType="fade"
        onRequestClose={() => setActiveFile(null)}
      >
        <ImageViewerModal
          fileId={activeFile?.fileId}
          title={activeFile?.title}
          onClose={() => setActiveFile(null)}
          insets={insets}
          t={t}
        />
      </Modal>

      {/* PDF loading overlay */}
      <Modal visible={!!activeFile && activeFile.type === 'loading'} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingBoxText}>{t('lessons.loading_file')}</Text>
            <Text style={styles.loadingBoxSub}>{activeFile?.title}</Text>
          </View>
        </View>
      </Modal>

      {/* Video Player Modal */}
      <Modal
        visible={!!activeVideo}
        animationType="fade"
        supportedOrientations={['landscape', 'landscape-left', 'landscape-right', 'portrait']}
        statusBarTranslucent
        onRequestClose={handleCloseVideo}
      >
        <View style={[styles.videoModal, { width: winW, height: winH }]}>
          {activeVideo?.vimeoId && (
            <WebView
              source={{ html: buildVimeoHtml(activeVideo.vimeoId), baseUrl: 'https://fitevolution.uz' }}
              style={StyleSheet.absoluteFill}
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              scrollEnabled={false}
              bounces={false}
              onMessage={handleWebViewMessage}
            />
          )}
          {/* Close button overlay */}
          <TouchableOpacity
            style={styles.videoCloseOverlay}
            onPress={handleCloseVideo}
          >
            <Ionicons name="close-circle" size={36} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  )
}

/* ─── Training Tab ─────────────────────────────────────── */

function TrainingTab({ trainingData, needsVariantSelection, isVariantLocked, expandedWeeks, expandedDays, progressMap, activeVideo, onToggleWeek, onToggleDay, onSelectVariant, onPlayVideo, onOpenFile, t }) {
  if (needsVariantSelection || !isVariantLocked) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateIcon}>📋</Text>
        <Text style={styles.emptyStateTitle}>{t('lessons.select_program_title')}</Text>
        <Text style={styles.emptyStateDesc}>{t('lessons.select_program_desc')}</Text>
        <TouchableOpacity style={styles.selectVariantBtn} onPress={onSelectVariant}>
          <Text style={styles.selectVariantBtnText}>{t('lessons.select_program_btn')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!trainingData?.variant) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    )
  }

  const { variant } = trainingData

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.variantName}>{variant.name}</Text>
      {variant.description ? <Text style={styles.variantDesc}>{variant.description}</Text> : null}

      {(variant.weeks || []).map((week) => (
        <View key={week.id} style={styles.weekCard}>
          <TouchableOpacity style={styles.weekHeader} onPress={() => onToggleWeek(week.id)}>
            <Text style={styles.weekTitle}>{t('lessons.week_label', { number: week.week_number })}</Text>
            <Ionicons
              name={expandedWeeks[week.id] ? 'chevron-up' : 'chevron-down'}
              size={18} color={COLORS.textSecondary}
            />
          </TouchableOpacity>

          {expandedWeeks[week.id] && (
            <View style={styles.daysContainer}>
              {(week.days || []).map((day) => (
                <View key={day.id}>
                  <TouchableOpacity
                    style={styles.dayRow}
                    onPress={() => !day.is_rest_day && onToggleDay(day.id)}
                    disabled={day.is_rest_day}
                  >
                    <View style={[styles.dayBadge, day.is_rest_day && styles.dayBadgeRest]}>
                      <Text style={styles.dayBadgeText}>{t(`lessons.${DAY_SHORT_KEYS[day.day_of_week]}`)}</Text>
                    </View>
                    <Text style={[styles.dayLabel, day.is_rest_day && styles.dayLabelRest]}>
                      {t(`lessons.${DAY_FULL_KEYS[day.day_of_week]}`)}
                      {day.is_rest_day ? t('lessons.rest_day') : ''}
                    </Text>
                    {!day.is_rest_day && (
                      <Ionicons
                        name={expandedDays[day.id] ? 'chevron-up' : 'chevron-down'}
                        size={16} color={COLORS.textSecondary}
                      />
                    )}
                  </TouchableOpacity>

                  {expandedDays[day.id] && !day.is_rest_day && (
                    <View style={styles.contentsContainer}>
                      {(day.contents || []).map((content) => (
                        <ContentItem
                          key={content.id}
                          content={content}
                          isActive={activeVideo?.contentId === content.id}
                          progress={progressMap[content.id]}
                          onPlay={() => content.content_type === 'video' ? onPlayVideo(content) : onOpenFile(content)}
                          t={t}
                        />
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  )
}

/* ─── Module Tab (Theory/Nutrition/Recovery) ────────────── */

function ModuleTab({ module, progressMap, activeVideo, onPlayVideo, onOpenFile, t }) {
  if (!module.contents?.length) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateIcon}>📭</Text>
        <Text style={styles.emptyStateTitle}>{t('lessons.no_materials')}</Text>
      </View>
    )
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {module.contents.map((content) => (
        <ContentItem
          key={content.id}
          content={content}
          isActive={activeVideo?.contentId === content.id}
          progress={progressMap[content.id]}
          onPlay={() => content.content_type === 'video' ? onPlayVideo(content) : onOpenFile(content)}
          t={t}
        />
      ))}
    </ScrollView>
  )
}

/* ─── Content Item ──────────────────────────────────────── */

function ContentItem({ content, isActive, progress, onPlay, t }) {
  const watchPercent = progress?.watch_percent || 0
  const isCompleted = progress?.is_completed
  const isVideo = content.content_type === 'video'
  const isPdf = content.content_type === 'pdf'

  const icon = isCompleted ? '✅' : isVideo ? '🎥' : isPdf ? '📄' : '🖼️'

  return (
    <TouchableOpacity
      style={[styles.contentItem, isActive && styles.contentItemActive]}
      onPress={onPlay}
      disabled={!isVideo && !content.gdrive_file}
    >
      <Text style={styles.contentIcon}>{icon}</Text>
      <Text style={[styles.contentTitle, isActive && styles.contentTitleActive]} numberOfLines={2}>
        {content.title}
      </Text>
      <View style={styles.contentMeta}>
        {content.is_preview && (
          <View style={styles.previewBadge}>
            <Text style={styles.previewText}>{t('lessons.preview_badge')}</Text>
          </View>
        )}
        {!isCompleted && watchPercent > 0 && (
          <Text style={styles.watchPercent}>{watchPercent}%</Text>
        )}
        {content.vimeo_video?.duration_formatted && (
          <Text style={styles.duration}>{content.vimeo_video.duration_formatted}</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

/* ─── Image Viewer Modal ─────────────────────────────────── */

function ImageViewerModal({ fileId, title, onClose, insets, t }) {
  const [imageUri, setImageUri] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!fileId) return
    let cancelled = false

    const load = async () => {
      try {
        const token = await storage.getAccessToken()
        const proxyUrl = `${API_URL}/storage/gdrive/${fileId}/view/`
        const localUri = FileSystem.cacheDirectory + `${fileId}.img`
        const { uri } = await FileSystem.downloadAsync(proxyUrl, localUri, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!cancelled) { setImageUri(uri); setLoading(false) }
      } catch {
        if (!cancelled) { setError(true); setLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [fileId])

  return (
    <View style={[imgStyles.container, { paddingTop: insets.top }]}>
      <View style={imgStyles.header}>
        <TouchableOpacity onPress={onClose} style={imgStyles.closeBtn}>
          <Ionicons name="close" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={imgStyles.title} numberOfLines={1}>{title}</Text>
      </View>
      <View style={imgStyles.body}>
        {loading && <ActivityIndicator size="large" color={COLORS.primary} />}
        {error && <Text style={{ color: COLORS.textSecondary }}>{t('lessons.error_image_load')}</Text>}
        {imageUri && (
          <ScrollView
            maximumZoomScale={4}
            minimumZoomScale={1}
            contentContainerStyle={imgStyles.scrollContent}
          >
            <Image source={{ uri: imageUri }} style={imgStyles.image} resizeMode="contain" />
          </ScrollView>
        )}
      </View>
    </View>
  )
}

const imgStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  closeBtn: { padding: 4 },
  title: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.white },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', aspectRatio: 1 },
})

/* ─── Styles ─────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },
  variantBtn: { padding: 4 },

  tabsScroll: { maxHeight: 52, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.lightGray,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabIcon: { fontSize: 14 },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },

  content: { flex: 1 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyStateIcon: { fontSize: 48 },
  emptyStateTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptyStateDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },
  selectVariantBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  selectVariantBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

  variantName: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  variantDesc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 20 },

  weekCard: { backgroundColor: COLORS.white, borderRadius: 14, marginBottom: 10, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  weekTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },

  daysContainer: { borderTopWidth: 1, borderTopColor: COLORS.border },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dayBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  dayBadgeRest: { backgroundColor: COLORS.lightGray },
  dayBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.white },
  dayLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  dayLabelRest: { color: COLORS.textSecondary },

  contentsContainer: { paddingLeft: 60, paddingRight: 14, paddingBottom: 8 },

  contentItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
  },
  contentItemActive: { backgroundColor: '#EEF0FB', borderWidth: 1, borderColor: COLORS.primary },
  contentIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  contentTitle: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 18 },
  contentTitleActive: { color: COLORS.primary, fontWeight: '600' },
  contentMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewBadge: { backgroundColor: '#EEF0FB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  previewText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  watchPercent: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  duration: { fontSize: 11, color: COLORS.textSecondary },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8, lineHeight: 20 },
  modalWarning: { fontSize: 13, color: '#EF4444', fontWeight: '600', marginBottom: 16 },
  variantOption: { backgroundColor: COLORS.background, borderRadius: 14, padding: 16, marginBottom: 10 },
  variantOptionName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  variantOptionDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelBtnText: { fontSize: 15, color: COLORS.textSecondary },

  confirmVariantName: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginVertical: 12 },
  warningBox: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 20 },
  warningText: { fontSize: 13, color: '#92400E', lineHeight: 18 },
  confirmBtns: { flexDirection: 'row', gap: 12 },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  confirmBtnYes: { backgroundColor: COLORS.primary },
  confirmBtnYesText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  confirmBtnNo: { backgroundColor: COLORS.lightGray },
  confirmBtnNoText: { color: COLORS.text, fontWeight: '700', fontSize: 15 },

  // Video
  videoModal: { backgroundColor: '#000' },
  videoCloseOverlay: {
    position: 'absolute', top: 28, right: 72,
    width: 52, height: 52,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 10,
  },

  loadingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  loadingBox: { backgroundColor: COLORS.white, borderRadius: 20, padding: 32, alignItems: 'center', gap: 12, marginHorizontal: 40 },
  loadingBoxText: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  loadingBoxSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
})
