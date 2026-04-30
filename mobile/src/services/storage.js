import AsyncStorage from '@react-native-async-storage/async-storage'

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  LANGUAGE: 'lang',
}

export const storage = {
  getAccessToken: () => AsyncStorage.getItem(KEYS.ACCESS_TOKEN),
  getRefreshToken: () => AsyncStorage.getItem(KEYS.REFRESH_TOKEN),
  setTokens: async (access, refresh) => {
    await AsyncStorage.multiSet([
      [KEYS.ACCESS_TOKEN, access],
      [KEYS.REFRESH_TOKEN, refresh],
    ])
  },
  clearTokens: async () => {
    await AsyncStorage.multiRemove([KEYS.ACCESS_TOKEN, KEYS.REFRESH_TOKEN])
  },
  getLanguage: () => AsyncStorage.getItem(KEYS.LANGUAGE),
  setLanguage: (lang) => AsyncStorage.setItem(KEYS.LANGUAGE, lang),
}
