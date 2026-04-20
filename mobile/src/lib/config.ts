import Constants from "expo-constants";

export function getEnv(name: "EXPO_PUBLIC_SUPABASE_URL" | "EXPO_PUBLIC_SUPABASE_ANON_KEY" | "EXPO_PUBLIC_WEB_API_BASE_URL") {
  return process.env[name] ?? Constants.expoConfig?.extra?.[name];
}

export function getWebApiBaseUrl() {
  const value = getEnv("EXPO_PUBLIC_WEB_API_BASE_URL");
  return typeof value === "string" ? value.replace(/\/+$/, "") : "";
}

export function getSupabaseConfig() {
  const url = getEnv("EXPO_PUBLIC_SUPABASE_URL");
  const anonKey = getEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");

  return {
    url: typeof url === "string" ? url : "",
    anonKey: typeof anonKey === "string" ? anonKey : "",
  };
}
