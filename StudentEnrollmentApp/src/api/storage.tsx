import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const memoryStorage = new Map<string, string>();

const canUseWebStorage = () =>
  Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage;

export const tokenStorage = {
  async getItem(key: string) {
    if (canUseWebStorage()) {
      return window.localStorage.getItem(key);
    }

    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },

  async setItem(key: string, value: string) {
    if (canUseWebStorage()) {
      window.localStorage.setItem(key, value);
      return;
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      memoryStorage.set(key, value);
    }
  },

  async removeItem(key: string) {
    if (canUseWebStorage()) {
      window.localStorage.removeItem(key);
      return;
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch {
      memoryStorage.delete(key);
    }
  },

  async removeAuthTokens() {
    await Promise.all([
      this.removeItem('accessToken'),
      this.removeItem('refreshToken'),
    ]);
  },
};
