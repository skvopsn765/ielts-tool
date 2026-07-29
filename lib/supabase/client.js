import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./env";

let browserClient = null;

export function createClient() {
  const { projectUrl, publishableKey, isConfigured } = getSupabasePublicEnv();
  if (!isConfigured) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(projectUrl, publishableKey);
  }

  return browserClient;
}

export function isSupabaseConfigured() {
  return getSupabasePublicEnv().isConfigured;
}
