// Public client configuration; never add a Supabase secret/service-role key here.
export const CLOUD_PROJECT_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://fdntjeknihekiqldyrpn.supabase.co";
export const CLOUD_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_HEAie5VWJVem6chJCp90Yg_Vx-imf_h";
