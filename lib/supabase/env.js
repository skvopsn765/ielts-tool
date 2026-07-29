const EMPTY_STRING = "";
const PLACEHOLDER_PROJECT_URL = "YOUR_PROJECT_REF";
const PLACEHOLDER_PUBLISHABLE_KEY = "YOUR_PUBLISHABLE_KEY";

export function getSupabasePublicEnv() {
  // 對應 Dashboard「Connect」裡的 Project URL / Publishable key
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ?? EMPTY_STRING;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? EMPTY_STRING;
  const isConfigured =
    projectUrl.length > 0 &&
    publishableKey.length > 0 &&
    !projectUrl.includes(PLACEHOLDER_PROJECT_URL) &&
    !publishableKey.includes(PLACEHOLDER_PUBLISHABLE_KEY);

  return {
    projectUrl,
    publishableKey,
    isConfigured,
  };
}
