import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseEnv = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export const getSupabaseKey = (env: SupabaseEnv) =>
  env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_ANON_KEY;

export const createSupabaseClientFromEnv = (
  env: SupabaseEnv,
): SupabaseClient | null => {
  if (!env.SUPABASE_URL) {
    return null;
  }
  const supabaseKey = getSupabaseKey(env);
  if (!supabaseKey) {
    return null;
  }

  return createClient(env.SUPABASE_URL, supabaseKey, {
    global: {
      fetch,
    },
    auth: {
      persistSession: false,
    },
  });
};
