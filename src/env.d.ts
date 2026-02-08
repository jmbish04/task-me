interface ImportMetaEnv {
  readonly PROD: boolean;
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
  readonly TURNSTILE_SECRET_TOKEN?: string;
  readonly SUPABASE_URL?: string;
  readonly SUPABASE_ANON_KEY?: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly STITCH_API_KEY?: string;
  readonly GITHUB_TOKEN?: string;
  readonly JULES_API_URL?: string;
  readonly R2_PUBLIC_BASE_URL?: string;
  readonly GENESIS_AI_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
