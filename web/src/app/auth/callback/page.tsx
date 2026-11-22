import OAuthCallback from "@/components/oauth-callback";
import { supabaseConfig } from "@/lib/server/config";
export const dynamic = "force-dynamic";
export default function CallbackPage() {
  const config = supabaseConfig();
  return <OAuthCallback url={config.url} publicKey={config.key}/>;
}
