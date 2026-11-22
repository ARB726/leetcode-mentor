"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Github, LoaderCircle } from "lucide-react";
import { browserSupabase } from "@/lib/browser-supabase";

export default function OAuthCallback({ url, publicKey }: { url: string; publicKey: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const exchange = useRef<Promise<void> | null>(null);
  useEffect(() => {
    let active = true;
    if (!exchange.current) {
      const query = new URLSearchParams(window.location.search);
      const code = query.get("code");
      window.history.replaceState(null, "", "/auth/callback");
      exchange.current = (async () => {
        if (!url || !publicKey) throw new Error("Account sign-in isn't available yet.");
        if (!code || query.has("error")) throw new Error("Sign-in wasn't completed. Return to the workspace and try again.");
        const client = browserSupabase(url, publicKey);
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) throw new Error("This sign-in link expired or was already used. Please start sign-in again.");
      })();
    }
    exchange.current.then(() => { if (active) router.replace("/"); }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Sign-in could not finish."); });
    return () => { active = false; };
  }, [url, publicKey, router]);
  return <main className="auth-callback"><div className="callback-card"><span className="callback-icon">{error ? <CircleAlert size={30}/> : <Github size={30}/>}</span><span className="eyebrow">LeetCode Mentor</span><h1>{error ? "Let's try that again." : "Opening your workspace."}</h1><p role={error ? "alert" : "status"}>{error || "Finishing your secure sign-in…"}</p>{error ? <a className="button primary" href="/">Return to workspace</a> : <LoaderCircle className="spin" size={23}/>}</div></main>;
}
