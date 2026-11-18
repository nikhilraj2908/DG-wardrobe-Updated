import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return await AsyncStorage.getItem(key);
      }

      // Native: Try SecureStore first
      const val = await SecureStore.getItemAsync(key);
      if (val !== null && val !== undefined) {
        return val;
      }

      // Backward-compatible migration: Check AsyncStorage if SecureStore was empty
      const legacyVal = await AsyncStorage.getItem(key);
      if (legacyVal !== null) {
        try {
          await SecureStore.setItemAsync(key, legacyVal);
        } catch {
          // ignore secure store write failures
        }
        return legacyVal;
      }

      return null;
    } catch {
      // Fallback to AsyncStorage if SecureStore throws (e.g. device keystore unlocked check)
      return await AsyncStorage.getItem(key);
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        await AsyncStorage.setItem(key, value);
        return;
      }

      await SecureStore.setItemAsync(key, value);
    } catch {
      // Fallback
      await AsyncStorage.setItem(key, value);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        await AsyncStorage.removeItem(key);
        return;
      }

      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }

    // Always ensure AsyncStorage copy is cleaned as well
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // ignore
    }
  },

  // Drop-in AsyncStorage compatibility aliases
  async getItem(key: string): Promise<string | null> {
    return this.get(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    return this.set(key, value);
  },

  async removeItem(key: string): Promise<void> {
    return this.remove(key);
  },

  async multiRemove(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.remove(key);
    }
  },
};
