import Workspace from "@/components/workspace";
import { supabaseConfig } from "@/lib/server/config";
export const dynamic = "force-dynamic";
export default function Home() {
  const supabase = supabaseConfig();
  return <Workspace config={{
    aiReady: Boolean(process.env.GROQ_API_KEY),
    supabaseUrl: supabase.url,
    supabaseKey: supabase.key,
    tableName: supabase.table,
  }} />;
}
