"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { browserSupabase } from "@/lib/browser-supabase";
import Repositories from "@/components/repositories";
import Markdown from "react-markdown";
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Boxes, Braces,
  Check, ChevronDown, ChevronRight, CircleAlert, Code2, FileCode2, FileText,
  FolderClock, GitBranch, Github, GraduationCap, History, Layers3, LayoutDashboard, Library,
  LoaderCircle, LogIn, LogOut, Menu, MessageSquare, Pencil, Plus, Save, Search,
  Sparkles, Terminal, Trash2, UserRound, X,
} from "lucide-react";
import { examples } from "@/lib/examples";
import type { Coaching, ImportedFile, Practice, PublicConfig, RepositorySource, Review } from "@/lib/types";
import { agentCatalog, type AgentTrace, type PipelineReport } from "@/lib/pipeline";
import { readReviewStream } from "@/lib/review-stream";

type Page = "studio" | "history" | "patterns" | "repositories";
type Tab = "Review" | "Optimize" | "Pattern" | "Interview";
type Modal = "examples" | "auth" | "new" | "delete" | null;
type Draft = Pick<Practice, "title" | "problem" | "solution" | "language">;
const initialDraft: Draft = { ...examples[0], language: "Python" };
const storageKey = "leetcode-mentor:session-practices:v1";
const languages: Record<string, string> = { Python: "py", JavaScript: "js", TypeScript: "ts", Java: "java", "C++": "cpp", Go: "go", Rust: "rs" };
const navigation = [
  { id: "studio", text: "Practice studio", icon: LayoutDashboard },
  { id: "history", text: "Practice history", icon: History },
  { id: "patterns", text: "Pattern library", icon: Library },
  { id: "repositories", text: "My repositories", icon: Github },
] as const;
const patternNotes = [
  "Look up the complement of each value as you scan the array.",
  "Move two boundaries to maintain a substring that satisfies a constraint.",
  "Track open elements and match them in reverse order.",
];
const patternIcons = [Boxes, Braces, Layers3];

function prettyDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function localPractices(): Practice[] {
  const raw = sessionStorage.getItem(storageKey);
  return raw ? JSON.parse(raw) as Practice[] : [];
}
function message(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
async function api<T>(path: string, token?: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method, cache: "no-store",
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}). Please try again.`);
  return result as T;
}
function ReviewText({ children }: { children: string }) {
  return <div className="markdown"><Markdown>{children}</Markdown></div>;
}
function Section({ title, text }: { title: string; text: string }) {
  return <section className="result-section"><h4>{title}</h4><ReviewText>{text}</ReviewText></section>;
}
function Dialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = ref.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={ref} aria-label={title} className="dialog" onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div className="dialog-inner"><div className="dialog-heading"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={close}><X size={19}/></button></div>{children}</div>
  </dialog>;
}
function CodeEditor({ draft, filename, change, changeLanguage }: { draft: Draft; filename?: string; change: (value: string) => void; changeLanguage: (value: string) => void }) {
  const overlay = useRef<HTMLPreElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const count = draft.solution.split("\n").length;
  const syntax = /("[^"\n]*"|'[^'\n]*'|\/\/[^\n]*|#[^\n]*|\b(?:def|function|class|var|let|const|int|for|in|range|if|else|elif|return|while|break|continue|new|public|static|fn|func|true|false|True|False|None|null|len|set)\b|\b\d+\b)/g;
  return <div className="code-surface">
    <div className="filebar"><span className="filename"><FileCode2 size={15}/><span>{filename || `solution.${languages[draft.language] || "txt"}`}</span></span><label className="language-select"><span className="sr-only">Solution language</span><select value={draft.language} onChange={event => changeLanguage(event.target.value)}>{Object.keys(languages).map(language => <option key={language}>{language}</option>)}</select><ChevronDown size={13}/></label></div>
    <div className="source-area"><div className="gutter" ref={gutter} aria-hidden="true">{Array.from({ length: count }, (_, i) => <div key={i}>{i + 1}</div>)}</div>
      <div className="code-input"><pre ref={overlay} aria-hidden="true">{draft.solution.split(syntax).map((part, index) => index % 2 === 0 ? part : <span key={index} className={/^(#|\/\/)/.test(part) ? "tok-comment" : /^["']/.test(part) ? "tok-string" : /^\d/.test(part) ? "tok-number" : "tok-keyword"}>{part}</span>)}{"\n"}</pre>
        <textarea maxLength={16000} aria-label="Solution code" spellCheck={false} wrap="off" autoCapitalize="off" autoCorrect="off" value={draft.solution} placeholder="Write your solution here…" onChange={event => change(event.target.value)} onScroll={event => { if (overlay.current) { overlay.current.scrollTop = event.currentTarget.scrollTop; overlay.current.scrollLeft = event.currentTarget.scrollLeft; } if (gutter.current) gutter.current.scrollTop = event.currentTarget.scrollTop; }}/></div>
    </div>
    <div className="editor-status"><span><i className="dot"/> Editable</span><span>{count} {count === 1 ? "line" : "lines"}</span></div>
  </div>;
}
function Constellation() {
  return <div className="constellation" aria-hidden="true"><div className="graph-scene">
    <span className="edge e1"/><span className="edge e2"/><span className="edge e3"/><span className="edge e4"/><span className="edge e5"/><span className="edge e6"/>
    <span className="vertex v1">0</span><span className="vertex v2">1</span><span className="vertex v3">2</span><span className="vertex v4">3</span><span className="vertex v5">4</span>
  </div></div>;
}
function sourceDetails(source: RepositorySource) {
  return [`Repository ID: ${source.repositoryId}`, `File: ${source.path}`, `Branch: ${source.ref}`, `File SHA: ${source.sha}`].join("\n");
}
function exportPractice(draft: Draft, review: Review, coach: Coaching | null, source: RepositorySource | null) {
  const section = (title: string, value: string) => `## ${title}\n\n${value}\n`;
  const body = [`# ${draft.title}\n`, section("Problem", draft.problem), section("Solution", `\`\`\`${draft.language.toLowerCase()}\n${draft.solution}\n\`\`\``), section("Mentor review", review.summary), section("Correctness", review.correctness), section("Time complexity", review.timeComplexity), section("Space complexity", review.spaceComplexity), section("Edge cases", review.edgeCases.map(item => "- " + item).join("\n")), section("Trade-offs", review.tradeoffs), section("Optimized solution", `\`\`\`\n${review.optimizedCode}\n\`\`\``), section("Walkthrough", review.walkthrough), section(review.pattern, review.patternLesson), section("Next practice", review.nextPractice)];
  if (source) body.splice(2, 0, section("Imported source", sourceDetails(source).split("\n").map(line => "    " + line).join("\n")));
  if (coach) body.push(section("Interview feedback", coach.explanation), section("Trade-off discussion", coach.tradeoff), section("Follow-up", coach.followUp), section("Next repetition", coach.nextRep));
  const url = URL.createObjectURL(new Blob([body.join("\n")], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = (draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "practice") + "-review.md"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Workspace({ config }: { config: PublicConfig }) {
  const [client] = useState(() => config.supabaseUrl && config.supabaseKey ? browserSupabase(config.supabaseUrl, config.supabaseKey) : null);
  const [source, setSource] = useState<RepositorySource | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!client);
  const [page, setPage] = useState<Page>("studio");
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [review, setReview] = useState<Review | null>(null);
  const [coaching, setCoaching] = useState<Coaching | null>(null);
  const [reviewMode, setReviewMode] = useState<"quick" | "deep">("deep");
  const [traces, setTraces] = useState<AgentTrace[]>([]);
  const [pipelineReport, setPipelineReport] = useState<PipelineReport | null>(null);
  const reviewAbort = useRef<AbortController | null>(null);
  const [identity, setIdentity] = useState<{ id: string; createdAt: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>("Review");
  const [modal, setModal] = useState<Modal>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<"" | "review" | "coach" | "save">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [targetRole, setTargetRole] = useState("Software engineer");
  const [explanation, setExplanation] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNote, setAuthNote] = useState("");
  const [practices, setPractices] = useState<Practice[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [deleting, setDeleting] = useState(false);
  const epoch = useRef(0);
  const results = useRef<HTMLElement>(null);
  const briefInput = useRef<HTMLTextAreaElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const mobileMenu = useRef<HTMLButtonElement>(null);
  const authUser = useRef<string | undefined>(undefined);
  const token = session?.access_token;
  const example = examples.find(item => item.title === draft.title && item.problem === draft.problem);
  useEffect(() => {
    return () => reviewAbort.current?.abort();
  }, []);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("mentor:oauth-draft");
      sessionStorage.removeItem("mentor:oauth-draft");
      if (raw) {
        const pending = JSON.parse(raw);
        if (pending.returnTo === "repositories") setPage("repositories");
        if (typeof pending.title === "string" && typeof pending.problem === "string" && typeof pending.solution === "string" && pending.language in languages && pending.problem.length <= 16000 && pending.solution.length <= 16000) setDraft({ title: pending.title, problem: pending.problem, solution: pending.solution, language: pending.language });
      }
    } catch { /* The workspace still works when browser storage is unavailable. */ }
  }, []);
  useEffect(() => {
    if (!client) return;
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      if (authUser.current !== next?.user.id) {
        if (authUser.current) {
          setReview(null); setCoaching(null); setDraft(initialDraft); setSource(null); setExplanation(""); setTab("Review"); setEditing(false);
        }
        epoch.current++; setBusy(""); setSaved(false); setIdentity(null); setPractices([]); setHistoryError(""); setNotice("");
        reviewAbort.current?.abort(); setTraces([]); setPipelineReport(null);
      }
      authUser.current = next?.user.id; setSession(next); setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, [client]);
  useEffect(() => {
    if (page !== "history" || !authReady) return;
    let active = true;
    setHistoryBusy(true); setHistoryError(""); setPractices([]);
    async function load() {
      try {
        const records = token ? (await api<{ practices: Practice[] }>("/api/practices", token)).practices : localPractices();
        if (active) setPractices(records);
      } catch (err) { if (active) setHistoryError(message(err)); }
      finally { if (active) setHistoryBusy(false); }
    }
    void load();
    return () => { active = false; };
  }, [page, token, authReady, refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!menuOpen) return;
    const wide = window.matchMedia("(min-width: 761px)");
    const closeOnResize = () => { if (wide.matches) setMenuOpen(false); };
    sidebar.current?.querySelector<HTMLButtonElement>('[aria-current="page"]')?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        requestAnimationFrame(() => mobileMenu.current?.focus());
      }
      if (event.key !== "Tab") return;
      const controls = sidebar.current?.querySelectorAll<HTMLElement>("a[href], button:enabled");
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    wide.addEventListener("change", closeOnResize);
    window.addEventListener("keydown", key);
    return () => {
      wide.removeEventListener("change", closeOnResize);
      window.removeEventListener("keydown", key);
    };
  }, [menuOpen]);
  function navigate(next: Page) {
    if (next !== page || menuOpen) requestAnimationFrame(() => document.getElementById("main-content")?.focus({ preventScroll: true }));
    setPage(next); setMenuOpen(false); setError(""); setQuery(""); window.scrollTo({ top: 0 });
  }
  function invalidate() {
    reviewAbort.current?.abort(); setTraces([]); setPipelineReport(null);
    epoch.current++; setReview(null); setCoaching(null); setIdentity(null); setSaved(false); setBusy(""); setTab("Review"); setError(""); setNotice("");
  }
  function changeDraft(field: keyof Draft, value: string) {
    if (field === "solution" || field === "language") setSource(null);
    invalidate(); setDraft(previous => ({ ...previous, [field]: value }));
  }
  function loadDraft(next: Draft) {
    setSource(null);
    invalidate(); setDraft(next); setEditing(!next.problem); setExplanation(""); setModal(null); navigate("studio");
  }
  function loadPractice(practice: Practice) {
    loadDraft({ title: practice.title, problem: practice.problem, solution: practice.solution, language: practice.language });
    setReview(practice.review); setCoaching(practice.coaching || null); setIdentity({ id: practice.id, createdAt: practice.createdAt }); setSaved(true);
    setSource(practice.source || null);
  }
  function importFile(file: ImportedFile) {
    loadDraft({ title: file.name, problem: "", solution: file.code, language: file.language });
    setSource(file.source);
    requestAnimationFrame(() => briefInput.current?.focus());
    setNotice(`Imported ${file.name}. Add the problem brief, then review your code.`);
  }
  async function signInWithGitHub() {
    if (!client || authBusy) return;
    setAuthBusy(true); setAuthError("");
    try {
      try { sessionStorage.setItem("mentor:oauth-draft", JSON.stringify({ ...draft, returnTo: page })); } catch { /* Sign-in remains available without draft persistence. */ }
      const { error } = await client.auth.signInWithOAuth({ provider: "github", options: { scopes: "read:user user:email", redirectTo: window.location.origin + "/auth/callback" } });
      if (error) throw error;
    } catch (reason) {
      try { sessionStorage.removeItem("mentor:oauth-draft"); } catch { /* Storage is optional. */ }
      setAuthError(message(reason)); setAuthBusy(false);
    }
  }
  function openAuth() { setAuthError(""); setAuthNote(""); setAuthMode("signin"); setMenuOpen(false); setModal("auth"); }
  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || authBusy) return;
    const data = new FormData(event.currentTarget);
    const credentials = { email: String(data.get("email")).trim(), password: String(data.get("password")) };
    setAuthBusy(true); setAuthError(""); setAuthNote("");
    try {
      const result = authMode === "signin" ? await client.auth.signInWithPassword(credentials) : await client.auth.signUp({ ...credentials, options: { emailRedirectTo: window.location.origin + "/auth/callback" } });
      if (result.error) throw result.error;
      if (result.data.session) { setModal(null); setNotice("Signed in to your workspace."); }
      else setAuthNote("Check your email to confirm your account, then sign in.");
    } catch (err) { setAuthError(message(err)); } finally { setAuthBusy(false); }
  }
  async function signOut() {
    if (!client) return;
    const result = await client.auth.signOut();
    if (result.error) { setError(result.error.message); return; }
    setMenuOpen(false); setNotice("Signed out.");
  }
  async function generate(mode: "review" | "coach") {
    if (busy || !authReady) return;
    if (client && !session) { openAuth(); return; }
    const current = ++epoch.current;
    setBusy(mode); setError(""); setNotice("");
    try {
      if (mode === "review") {
        setReview(null); setCoaching(null);
        setPipelineReport(null);
        setTraces(reviewMode === "deep" ? agentCatalog.map(agent => ({ id: agent.id, state: "queued" })) : []);
        if (reviewMode === "deep") {
          const controller = new AbortController(); reviewAbort.current = controller;
          const response = await fetch("/api/review", { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ problem: draft.problem, solution: draft.solution, language: draft.language, mode: "deep" }) });
          if (!response.ok) { const failure = await response.json(); throw new Error(failure.error || "Deep review could not start."); }
          await readReviewStream(response, event => {
            if (epoch.current !== current) return;
            if (event.type === "agent") setTraces(previous => previous.map(item => item.id === event.agent.id ? event.agent : item));
            if (event.type === "result") { setReview(event.review); setPipelineReport(event.report); setCoaching(null); setSaved(false); setTab("Review"); }
          });
          if (epoch.current === current) requestAnimationFrame(() => results.current?.scrollIntoView({ block: "start" }));
          return;
        }
        const data = await api<{ review: Review }>("/api/review", token, "POST", { problem: draft.problem, solution: draft.solution, language: draft.language });
        if (epoch.current !== current) return;
        setReview(data.review); setCoaching(null); setSaved(false); setTab("Review");
        requestAnimationFrame(() => results.current?.scrollIntoView({ block: "start" }));
      } else {
        const data = await api<{ coaching: Coaching }>("/api/coach", token, "POST", { problem: draft.problem, solution: draft.solution, language: draft.language, review, explanation, targetRole });
        if (epoch.current === current) { setCoaching(data.coaching); setSaved(false); }
      }
    } catch (err) { if (epoch.current === current) setError(message(err)); } finally { if (epoch.current === current) setBusy(""); }
  }
  async function save() {
    if (!review || busy || !authReady) return;
    const current = ++epoch.current;
    setBusy("save"); setError("");
    const entry: Practice = { ...draft, title: draft.title.trim() || "Untitled practice", id: identity?.id || crypto.randomUUID(), createdAt: identity ? new Date(identity.createdAt).toISOString() : new Date().toISOString(), review, ...(coaching ? { coaching } : {}), ...(source ? { source } : {}) };
    try {
      const stored = token ? (await api<{ practice: Practice }>("/api/practices", token, "POST", entry)).practice : entry;
      if (!token) sessionStorage.setItem(storageKey, JSON.stringify([entry, ...localPractices().filter(item => item.id !== entry.id)]));
      if (current !== epoch.current) return;
      setIdentity({ id: stored.id, createdAt: stored.createdAt }); setSaved(true); setNotice(token ? "Practice saved to your account." : "Practice saved in this browser tab.");
    } catch (err) { if (current === epoch.current) setError(message(err)); } finally { if (current === epoch.current) setBusy(""); }
  }
  async function deletePractice() {
    setDeleting(true); setHistoryError("");
    try {
      if (token) await api("/api/practices?id=" + encodeURIComponent(deleteId), token, "DELETE");
      else sessionStorage.setItem(storageKey, JSON.stringify(localPractices().filter(item => item.id !== deleteId)));
      if (identity?.id === deleteId) { setIdentity(null); setSaved(false); }
      setRefresh(value => value + 1); setNotice("Practice deleted.");
    } catch (err) { setHistoryError(message(err)); } finally { setDeleting(false); setModal(null); }
  }
  const pageTitle = navigation.find(item => item.id === page)!.text;
  const filtered = practices.filter(practice => (practice.title + " " + practice.language + " " + practice.review.pattern).toLowerCase().includes(query.toLowerCase()));
  const journey = [
    { label: "Write", detail: "Shape your solution", done: Boolean(draft.problem.trim() && draft.solution.trim()), action: () => document.querySelector<HTMLTextAreaElement>('[aria-label="Solution code"]')?.focus() },
    { label: "Review", detail: "Understand the tradeoffs", done: Boolean(review), action: () => results.current?.scrollIntoView({ block: "start" }) },
    { label: "Rehearse", detail: "Explain your reasoning", done: Boolean(coaching), action: () => { setTab("Interview"); results.current?.scrollIntoView({ block: "start" }); } },
  ];
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    {menuOpen && <button className="mobile-scrim" tabIndex={-1} aria-label="Close navigation" onClick={() => { setMenuOpen(false); requestAnimationFrame(() => mobileMenu.current?.focus()); }}/>}
    <aside ref={sidebar} id="workspace-sidebar" aria-label="Workspace navigation" className={`sidebar ${menuOpen ? "open" : ""}`}>
      {menuOpen && <button className="mobile-close icon-button" aria-label="Close navigation" onClick={() => { setMenuOpen(false); requestAnimationFrame(() => mobileMenu.current?.focus()); }}><X size={18}/></button>}
      <a className="brand" href="#studio" onClick={event => { event.preventDefault(); navigate("studio"); }}><span className="brand-icon"><Code2 size={24} strokeWidth={2.7}/></span><span>LeetCode <b>Mentor</b></span></a>
      <div className="nav-group"><span className="nav-label">Workspace</span><nav aria-label="Workspace">{navigation.map(({ id, text, icon: Icon }) => <button className={`nav-item ${page === id ? "active" : ""}`} aria-current={page === id ? "page" : undefined} key={id} onClick={() => navigate(id)}><Icon size={18}/>{text}{page === id && <span className="nav-marker"/>}</button>)}</nav></div>
      <div className="side-bottom"><div className="mentor-status"><span className="mentor-status-icon"><Sparkles size={16}/></span><div><strong>AI mentor</strong><small><i className={`dot ${config.aiReady ? "" : "muted-dot"}`}/>{config.aiReady ? "Configured" : "Setup required"}</small></div></div>
        <div className="account"><span className="avatar"><UserRound size={17}/></span><div><strong>{session?.user.email || (client ? "Guest workspace" : "Local workspace")}</strong><small>{session ? "Personal account" : "Browser session"}</small></div>{client && <button className="account-btn" aria-label={session ? "Sign out" : "Sign in"} title={session ? "Sign out" : "Sign in"} onClick={session ? signOut : openAuth}>{session ? <LogOut size={17}/> : <LogIn size={17}/>}</button>}</div>
      </div>
    </aside>
    <div className="main-shell" inert={menuOpen}>
      <header className="topbar"><button ref={mobileMenu} className="mobile-menu icon-button" aria-label="Open navigation" aria-controls="workspace-sidebar" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={20}/></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={13}/><strong>{pageTitle}</strong></div>
        <div className="session-pill"><i className="dot"/>{session ? "Account session" : "Browser session"}</div>{client && !session && <button className="top-login" onClick={openAuth}>Sign in <ArrowUpRight size={13}/></button>}
      </header>
      <main key={page} className="workspace-page" id="main-content" tabIndex={-1}>{page !== "repositories" && <div className="page-heading"><div><div className="eyebrow"><span className="eyeline"/>{page === "studio" ? "A little practice. A sharper instinct." : page === "history" ? "Your workspace" : "Study collection"}</div><h1>{pageTitle}</h1><p>{page === "studio" ? "Turn “I can solve it” into “I can explain it.” One thoughtful rep at a time." : page === "history" ? (session ? "Revisit the reviews saved to your account." : "Revisit the reviews saved in this browser tab.") : "Explore algorithm patterns through focused practice problems."}</p></div>
        {(page === "studio" || page === "history") && <button className="button light" onClick={() => setModal("new")}><Plus size={16}/>New practice</button>}
      </div>}
      {error && <div className="alert" role="alert"><CircleAlert size={17}/><span>{error}</span><button className="icon-button" aria-label="Dismiss error" onClick={() => setError("")}><X size={15}/></button></div>}
      {page === "studio" && <>
        <nav className="practice-journey" aria-label="Practice steps">{journey.map((step, index) => <button key={step.label} className={step.done ? "journey-step complete" : "journey-step"} disabled={index === 2 && !review} onClick={step.action}><span className="journey-icon">{step.done ? <Check size={17}/> : index === 0 ? <Code2 size={17}/> : index === 1 ? <Sparkles size={17}/> : <MessageSquare size={17}/>}</span><span><strong>{step.label}</strong><small>{step.detail}</small></span><span className="journey-state">{step.done ? "Done" : index === journey.findIndex(item => !item.done) ? "Next" : "Later"}</span></button>)}</nav>
        <section className="challenge-banner"><div className="banner-copy"><span className="banner-kicker"><span className="live-square"/>Current challenge</span><h2>{draft.title || "Untitled practice"}</h2><div className="challenge-tags">{example && <span className={`level ${example.difficulty === "Medium" ? "medium" : ""}`}><i/>{example.difficulty}</span>}<span><GitBranch size={13}/>{example?.pattern || review?.pattern || "Custom problem"}</span></div></div><Constellation/><button className="switch-button" onClick={() => setModal("examples")}>Switch example <ChevronDown size={14}/></button></section>
        <div className="work-grid">
          <section className="panel editor-panel"><div className="panel-head"><div className="panel-icon dark"><Terminal size={19}/></div><h2>Solution editor</h2><span className="panel-corner"><Code2 size={16}/></span></div>
            <CodeEditor draft={draft} filename={source?.path.split("/").at(-1)} change={value => changeDraft("solution", value)} changeLanguage={value => changeDraft("language", value)}/>
            {source && <p className="source-provenance"><Github size={14}/><span className="sr-only">Imported from GitHub</span><strong>{source.path}</strong><span><GitBranch size={13}/>{source.ref}</span><code title={source.sha}>{source.sha.slice(0, 7)}</code></p>}
            <div className="review-mode" role="group" aria-label="Review depth"><button aria-pressed={reviewMode === "quick"} disabled={!!busy} onClick={() => setReviewMode("quick")}><strong>Quick review</strong><small>One focused model call</small></button><button aria-pressed={reviewMode === "deep"} disabled={!!busy} onClick={() => setReviewMode("deep")}><strong>Deep review <span>7 specialists</span></strong><small>Independent perspectives, one clear report</small></button></div>
            <div className="runbar"><button className="button primary" disabled={!!busy || !authReady || !config.aiReady || !draft.problem.trim() || !draft.solution.trim()} onClick={() => generate("review")}>{busy === "review" ? <LoaderCircle className="spin" size={17}/> : <Sparkles size={17}/>} {busy === "review" ? "Reviewing…" : reviewMode === "deep" ? "Start deep review" : "Review solution"}</button>{busy === "review" && <button className="text-button" onClick={() => { reviewAbort.current?.abort(); epoch.current++; setBusy(""); setNotice("Review cancelled. Your code is still here."); setTraces(previous => previous.map(trace => trace.state === "running" || trace.state === "queued" ? { ...trace, state: "failed", error: "Cancelled" } : trace)); }}>Cancel</button>}{!config.aiReady && <small>AI setup required</small>}</div>
          </section>
          <section className="panel brief-panel"><div className="panel-head"><div className="panel-icon pale"><FileText size={18}/></div><h2>Problem brief</h2><button className="icon-button" title={editing ? "Finish editing" : "Edit problem brief"} aria-label={editing ? "Finish editing problem" : "Edit problem brief"} onClick={() => setEditing(!editing)}>{editing ? <Check size={17}/> : <Pencil size={15}/>}</button></div>
            {editing ? <div className="brief-edit"><label>Challenge title<input value={draft.title} onChange={event => changeDraft("title", event.target.value)} maxLength={160}/></label><label>Problem statement<textarea ref={briefInput} maxLength={16000} value={draft.problem} placeholder="Paste the problem, examples, and constraints…" onChange={event => changeDraft("problem", event.target.value)}/></label><button className="text-button" onClick={() => setEditing(false)}><Check size={14}/>Done editing</button></div> :
              <div className="brief-content">{draft.problem ? draft.problem.split(/\n\s*\n/).map((part, i) => {
                const lines = part.split(/\n(?=Constraints?:)/i);
                return <div key={i}>{lines.map((line, j) => /^Examples?:/i.test(line) ? <div className="example-block" key={j}><h3><Terminal size={13}/>Example</h3><pre>{line.replace(/^Examples?:\s*/i, "")}</pre></div> : /^Constraints?:/i.test(line) ? <div className="constraints" key={j}><h3>Constraints</h3><p>{line.replace(/^Constraints?:\s*/i, "")}</p></div> : <p key={j}>{line}</p>)}</div>;
              }) : <button className="text-button" onClick={() => setEditing(true)}>Add a problem statement <ArrowRight size={14}/></button>}</div>}
          </section>
        </div>
        {traces.length > 0 && <section className="panel pipeline-panel" aria-label="Seven specialist review pipeline"><div className="pipeline-heading"><div><span className="eyebrow">Independent analysis. Shared perspective.</span><h2>Your review team</h2></div><span className="pipeline-total" role="status">{traces.filter(trace => trace.state === "completed").length} / 7 complete{pipelineReport ? ` · ${(pipelineReport.elapsedMs / 1000).toFixed(1)}s` : ""}</span></div><div className="agent-grid">{agentCatalog.map(agent => { const trace = traces.find(item => item.id === agent.id)!; return <div key={agent.id} className={`agent-card agent-${trace.state} ${agent.id === "synthesis" ? "agent-synthesis" : ""}`}><span className="agent-status-icon">{trace.state === "running" ? <LoaderCircle className="spin" size={18}/> : trace.state === "completed" ? <Check size={18}/> : trace.state === "failed" ? <CircleAlert size={18}/> : <Layers3 size={18}/>}</span><div><h3>{agent.name}</h3><p>{agent.task}</p><span className="agent-state">{trace.state}{trace.durationMs !== undefined ? ` · ${(trace.durationMs / 1000).toFixed(1)}s` : ""}</span>{trace.error && <small className="agent-error">{trace.error}</small>}</div></div>; })}</div>{pipelineReport && <div className="pipeline-footnote"><span>Usage from completed calls: {pipelineReport.inputTokens.toLocaleString()} input / {pipelineReport.outputTokens.toLocaleString()} output tokens.</span><span>AI analysis; code has not been executed.</span></div>}{pipelineReport?.warnings.map(warning => <p className="pipeline-warning" key={warning}>{warning}</p>)}</section>}
        <section className="panel results" ref={results}><div className="panel-head"><div className="panel-icon mint"><Sparkles size={18}/></div><h2>Mentor feedback</h2>{review && <div className="result-actions"><button className="text-button" onClick={() => window.print()}><FileText size={15}/><span>Print / PDF</span></button><button className="text-button" aria-label="Download Markdown report" onClick={() => exportPractice(draft, review, coaching, source)}><ArrowDownToLine size={15}/><span>Report</span></button><button className="text-button" disabled={!!busy || saved} onClick={save}>{saved ? <Check size={15}/> : <Save size={15}/>}<span>{saved ? "Saved" : busy === "save" ? "Saving…" : "Save practice"}</span></button></div>}</div>
          {!review ? <div className={`feedback-empty ${busy === "review" ? "review-in-progress" : ""}`} role="status" aria-live="polite"><span className="empty-orbit">{busy === "review" ? <LoaderCircle className="spin" size={20}/> : <MessageSquare size={20}/>}</span><div><h3>{busy === "review" ? "Your mentor is reading through your approach…" : "Good practice starts with a little curiosity."}</h3><p>{busy === "review" ? "Checking reasoning, edge cases, and opportunities to simplify. Your code stays editable." : "Write your solution, then get a fresh perspective on correctness, complexity, and what to try next."}<span className="feedback-chips"><span>Correctness</span><span>Complexity</span><span>Pattern recognition</span></span></p></div></div> : <>
            <div className="tabs" role="group" aria-label="Feedback sections">{(["Review", "Optimize", "Pattern", "Interview"] as Tab[]).map(item => <button key={item} aria-pressed={tab === item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
            <div className="result-content" key={tab}>{tab === "Review" && <><Section title="Review summary" text={review.summary}/><Section title="Correctness" text={review.correctness}/><div className="complexity"><Section title="Time complexity" text={review.timeComplexity}/><Section title="Space complexity" text={review.spaceComplexity}/></div><section className="result-section"><h4>Edge cases</h4><ul>{review.edgeCases.map((item, index) => <li key={index}><ReviewText>{item}</ReviewText></li>)}</ul></section></>}
            {tab === "Optimize" && <><Section title="Trade-offs" text={review.tradeoffs}/><h4>Optimized solution</h4><pre className="optimized">{review.optimizedCode}</pre><Section title="Walkthrough" text={review.walkthrough}/></>}
            {tab === "Pattern" && <><Section title={review.pattern} text={review.patternLesson}/><Section title="Practice next" text={review.nextPractice}/><button className="button light" onClick={() => navigate("patterns")}><Library size={15}/>Open pattern library</button></>}
            {tab === "Interview" && <><form className="coach-form" onSubmit={event => { event.preventDefault(); void generate("coach"); }}><h3>Rehearse your explanation</h3><label>Target role<input required maxLength={100} value={targetRole} onChange={event => setTargetRole(event.target.value)}/></label><label>Your explanation<textarea required maxLength={6000} value={explanation} onChange={event => setExplanation(event.target.value)} placeholder="Explain your approach as you would to an interviewer…"/></label><button className="button primary" disabled={!!busy || !config.aiReady || !explanation.trim() || !targetRole.trim()}>{busy === "coach" ? <LoaderCircle size={16} className="spin"/> : <GraduationCap size={16}/>} {busy === "coach" ? "Preparing feedback…" : "Get interview feedback"}</button></form>{coaching && <><Section title="Explanation feedback" text={coaching.explanation}/><Section title="Trade-off discussion" text={coaching.tradeoff}/><Section title="Follow-up question" text={coaching.followUp}/><Section title="Next repetition" text={coaching.nextRep}/></>}</>}
            </div></>}
        </section>
      </>}
      {page === "patterns" && <div className="library-grid">{examples.map((item, index) => { const Icon = patternIcons[index]; return <article className={"library-card color-" + index} key={item.title}><div className="library-art"><Icon size={45} strokeWidth={1.4}/></div><div className="library-body"><span className="small-label">{item.difficulty}</span><h2>{item.pattern}</h2><p>{patternNotes[index]}</p><button className="text-button" onClick={() => loadDraft({ ...item, language: "Python" })}>Practice {item.title}<ArrowRight size={15}/></button></div></article>; })}</div>}
      {page === "repositories" && <Repositories key={session?.user.id || "guest"} token={token} configured={!!client} authReady={authReady} onPractice={() => navigate("studio")} onSignIn={openAuth} onImport={importFile}/>}
      {page === "history" && <section className="panel history"><div className="panel-head"><div className="panel-icon pale"><FolderClock size={18}/></div><h2>Saved practices</h2><button className="text-button" disabled={historyBusy} onClick={() => setRefresh(value => value + 1)}>Refresh</button></div>
        {historyError ? <div className="alert" role="alert">{historyError}</div> : historyBusy ? <div className="center-state" role="status"><LoaderCircle className="spin"/>Loading practices…</div> : practices.length ? <><label className="search-box"><Search size={16}/><input type="search" aria-label="Search saved practices" placeholder="Search practices" value={query} onChange={event => setQuery(event.target.value)}/></label>{filtered.length ? filtered.map(item => <div className="history-row" key={item.id}><button className="history-open" onClick={() => loadPractice(item)}><div className="panel-icon pale"><FileCode2 size={18}/></div><span><strong>{item.title}</strong><small>{item.language} · {prettyDate(item.createdAt)}</small></span><ChevronRight size={16}/></button><button className="icon-button danger-icon" aria-label={`Delete ${item.title}`} onClick={() => { setDeleteId(item.id); setModal("delete"); }}><Trash2 size={16}/></button></div>) : <div className="center-state">No matching practices.</div>}</> : <div className="center-state"><FolderClock size={32}/><h3>No saved practices yet</h3><p>Review a solution, then select Save practice to keep it here.</p><button className="button light" onClick={() => navigate("studio")}><ArrowLeft size={15}/>Back to studio</button></div>}
      </section>}
      </main>
    </div>
    {review && <article className="print-report"><h1>{draft.title}</h1><p>LeetCode Mentor · {draft.language} · AI analysis; code not executed</p>{source && <><h2>Imported source</h2><pre>{sourceDetails(source)}</pre></>}<Section title="Problem" text={draft.problem}/><h2>Submitted solution</h2><pre>{draft.solution}</pre><Section title="Summary" text={review.summary}/><Section title="Correctness" text={review.correctness}/><Section title="Time complexity" text={review.timeComplexity}/><Section title="Space complexity" text={review.spaceComplexity}/><h2>Edge cases</h2><ul>{review.edgeCases.map((item, index) => <li key={index}>{item}</li>)}</ul><Section title="Tradeoffs" text={review.tradeoffs}/><h2>Proposed optimization</h2><pre>{review.optimizedCode}</pre><Section title="Walkthrough" text={review.walkthrough}/><Section title={review.pattern} text={review.patternLesson}/><Section title="Practice next" text={review.nextPractice}/>{coaching && <><Section title="Interview explanation" text={coaching.explanation}/><Section title="Tradeoff discussion" text={coaching.tradeoff}/><Section title="Follow-up" text={coaching.followUp}/><Section title="Next repetition" text={coaching.nextRep}/></>}{pipelineReport && <><h2>Pipeline trace</h2><p>Total: {(pipelineReport.elapsedMs / 1000).toFixed(1)} seconds</p><ul>{pipelineReport.traces.map(trace => <li key={trace.id}>{agentCatalog.find(agent => agent.id === trace.id)!.name}: {trace.state} ({((trace.durationMs || 0) / 1000).toFixed(1)}s)</li>)}</ul>{pipelineReport.warnings.map(warning => <p key={warning}>{warning}</p>)}</>}</article>}
    {notice && <div className="toast" role="status"><Check size={16}/>{notice}</div>}
    {modal === "examples" && <Dialog title="Choose an example" close={() => setModal(null)}><div className="choice-list">{examples.map((item, index) => { const Icon = patternIcons[index]; return <button key={item.title} onClick={() => loadDraft({ ...item, language: "Python" })}><span className="panel-icon mint"><Icon size={18}/></span><span><strong>{item.title}</strong><small>{item.pattern} · {item.difficulty}</small></span><ArrowRight size={16}/></button>; })}</div></Dialog>}
    {modal === "new" && <Dialog title="Start a practice" close={() => setModal(null)}><div className="choice-list"><button onClick={() => loadDraft({ title: "Custom challenge", problem: "", solution: "", language: "Python" })}><span className="panel-icon mint"><Plus size={18}/></span><span><strong>Blank practice</strong><small>Bring your own problem and solution</small></span><ArrowRight size={16}/></button><button onClick={() => setModal("examples")}><span className="panel-icon pale"><BookOpen size={18}/></span><span><strong>Choose an example</strong><small>Start with a practice problem and code</small></span><ArrowRight size={16}/></button></div></Dialog>}
    {modal === "delete" && <Dialog title="Delete this practice?" close={() => { if (!deleting) setModal(null); }}><p>This removes the saved review for {practices.find(item => item.id === deleteId)?.title || "this practice"}.</p><div className="dialog-buttons"><button className="button light" disabled={deleting} onClick={() => setModal(null)}>Cancel</button><button className="button danger" disabled={deleting} onClick={deletePractice}>{deleting ? "Deleting…" : "Delete practice"}</button></div></Dialog>}
    {modal === "auth" && <Dialog title={authMode === "signin" ? "Sign in to your workspace" : "Create your account"} close={() => { if (!authBusy) setModal(null); }}><p>Keep your reviews and repositories together.</p><button className="button github-login" disabled={authBusy} onClick={signInWithGitHub}>{authBusy ? <LoaderCircle className="spin" size={17}/> : <Github size={18}/>}Continue with GitHub</button><div className="auth-divider"><span>or use email</span></div><form className="auth-form" onSubmit={authenticate}><label>Email<input required type="email" name="email" autoComplete="email" placeholder="you@example.com"/></label><label>Password<input required minLength={authMode === "signup" ? 6 : undefined} type="password" name="password" autoComplete={authMode === "signin" ? "current-password" : "new-password"}/></label>{authError && <div className="alert" role="alert">{authError}</div>}{authNote && <p role="status">{authNote}</p>}<button className="button primary" disabled={authBusy}>{authBusy ? <LoaderCircle size={16} className="spin"/> : <LogIn size={16}/>} {authMode === "signin" ? "Sign in" : "Create account"}</button><button type="button" disabled={authBusy} className="text-button" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setAuthError(""); setAuthNote(""); }}>{authMode === "signin" ? "Create an account" : "Use an existing account"}</button></form></Dialog>}
  </div>;
}
