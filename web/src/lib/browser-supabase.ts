import { createClient } from "@supabase/supabase-js";

type BrowserClient = ReturnType<typeof createClient>;
let cached: { url: string; key: string; client: BrowserClient } | undefined;

export function browserSupabase(url: string, key: string) {
  const auth = { flowType: "pkce" as const, detectSessionInUrl: false };
  if (typeof window === "undefined") {
    return createClient(url, key, { auth: { ...auth, persistSession: false, autoRefreshToken: false } });
  }
  if (!cached || cached.url !== url || cached.key !== key) {
    cached = { url, key, client: createClient(url, key, { auth }) };
  }
  return cached.client;
}
