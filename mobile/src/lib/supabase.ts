import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

const { url, anonKey } = getSupabaseConfig();

const asyncStorageAdapter = {
  getItem: async (key: string) => AsyncStorage.getItem(String(key)),
  setItem: async (key: string, value: string) =>
    AsyncStorage.setItem(String(key), typeof value === "string" ? value : String(value)),
  removeItem: async (key: string) => AsyncStorage.removeItem(String(key)),
};

export const mobileSupabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: asyncStorageAdapter,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;
