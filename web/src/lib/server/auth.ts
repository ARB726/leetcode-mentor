import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";
import { ApiError } from "./http";

export async function requestIdentity(request: Request, required = false) {
  const config = supabaseConfig();
  if (!config.url || !config.key) {
    if (required) throw new ApiError(503, "Connect the existing Supabase project to enable saved practice.");
    const ip = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "local";
    return { user: null, supabase: null, key: "demo:" + ip };
  }
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new ApiError(401, "Sign in to use your practice workspace.");
  const supabase = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new ApiError(401, "Your session has expired. Please sign in again.");
  return { user: data.user, supabase, key: "user:" + data.user.id };
}
