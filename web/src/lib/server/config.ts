export function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  if (Boolean(url) !== Boolean(key)) throw new Error("Configure both the Supabase URL and public key.");
  if (key) {
    let publicKey = key.startsWith("sb_publishable_");
    try { publicKey ||= JSON.parse(Buffer.from(key.split(".")[1] || "", "base64url").toString()).role === "anon"; } catch { /* Not a legacy anon JWT. */ }
    if (!publicKey) throw new Error("Use a Supabase publishable/anon key, never a secret or service-role key.");
    const endpoint = new URL(url);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) throw new Error("Use the HTTPS Supabase project URL.");
  }
  return {
    url, key,
    table: process.env.SUPABASE_REVIEWS_TABLE || "mentor_reviews",
  };
}
