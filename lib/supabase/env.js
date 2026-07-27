const EMPTY_STRING = "";

export function getSupabasePublicEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? EMPTY_STRING;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? EMPTY_STRING;
  const isConfigured =
    supabaseUrl.length > 0 &&
    supabaseAnonKey.length > 0 &&
    !supabaseUrl.includes("YOUR_PROJECT_REF") &&
    !supabaseAnonKey.includes("YOUR_ANON_KEY");

  return {
    supabaseUrl,
    supabaseAnonKey,
    isConfigured,
  };
}
