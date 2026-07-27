import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./env";

let browserClient = null;

export function createClient() {
  const { supabaseUrl, supabaseAnonKey, isConfigured } = getSupabasePublicEnv();
  if (!isConfigured) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}

export function isSupabaseConfigured() {
  return getSupabasePublicEnv().isConfigured;
}
