"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BookOpen, Check, ChevronRight, CircleAlert, Code2, ExternalLink, FileCode2, Folder, FolderOpen, GitBranch, Github, Link2, LoaderCircle, Plus, RefreshCw, Terminal, Unlink } from "lucide-react";
import type { ImportedFile, LinkedRepository, RepositoryEntry } from "@/lib/types";

async function request<T>(path: string, token: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(path, { method, cache: "no-store", headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The repository request could not finish.");
  return data;
}
type RepositoriesProps = {
  token?: string;
  configured: boolean;
  authReady: boolean;
  onSignIn: () => void;
  onPractice: () => void;
  onImport: (file: ImportedFile) => void;
};

function RepositoryHeader() {
  return <header className="repository-hero">
    <div className="repo-intro">
      <span className="banner-kicker"><Github size={16}/>GitHub</span>
      <h1>My repositories</h1>
      <p>Bring a source file from a public GitHub repository into your practice studio.</p>
    </div>
    <div className="repo-illustration" aria-hidden="true">
      <div className="repo-sheet sheet-back"><GitBranch size={19}/></div>
      <div className="repo-sheet sheet-front"><FileCode2 size={20}/><i/><i/><i/></div>
      <div className="sheet-terminal"><Terminal size={20}/></div>
    </div>
  </header>;
}

export default function Repositories({ token, configured, authReady, onSignIn, onPractice, onImport }: RepositoriesProps) {
  const [repositories, setRepositories] = useState<LinkedRepository[]>([]);
  const [selected, setSelected] = useState<LinkedRepository | null>(null);
  const [entries, setEntries] = useState<RepositoryEntry[]>([]);
  const [path, setPath] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(token ? "loading" : "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const generation = useRef(0);
  const browserHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const current = ++generation.current;
    setRepositories([]); setSelected(null); setEntries([]); setError(""); setNotice(""); setConfirm(null);
    if (!token) return;
    setBusy("loading");
    request<{ repositories: LinkedRepository[] }>("/api/repositories", token).then(data => { if (current === generation.current) setRepositories(data.repositories); }).catch(reason => { if (current === generation.current) setError(reason.message); }).finally(() => { if (current === generation.current) setBusy(""); });
    return () => { generation.current++; };
  }, [token, refresh]);
  async function link(event: FormEvent) {
    event.preventDefault(); if (!token || busy) return;
    const current = generation.current; setBusy("link"); setError(""); setNotice("");
    try {
      const data = await request<{ repository: LinkedRepository }>("/api/repositories", token, "POST", { url });
      if (current !== generation.current) return;
      setRepositories(previous => [data.repository, ...previous.filter(item => item.id !== data.repository.id)]); setUrl(""); setNotice("Repository linked to your workspace.");
    } catch (reason) { if (current === generation.current) setError(reason instanceof Error ? reason.message : "The repository could not be linked."); }
    finally { if (current === generation.current) setBusy(""); }
  }
  async function browse(repo: LinkedRepository, nextPath = "") {
    if (!token || busy) return;
    const current = generation.current; setBusy("browse"); setError(""); setNotice("");
    if (selected?.id !== repo.id) { setSelected(repo); setEntries([]); setPath(""); setTruncated(false); }
    try {
      const data = await request<({ kind: "directory"; entries: RepositoryEntry[]; truncated: boolean; path: string } | ({ kind: "file" } & ImportedFile))>(`/api/repositories/${repo.id}/contents?path=${encodeURIComponent(nextPath)}`, token);
      if (current !== generation.current) return;
      if (data.kind === "file") onImport(data);
      else {
        setSelected(repo); setEntries(data.entries); setPath(data.path); setTruncated(data.truncated);
        requestAnimationFrame(() => browserHeading.current?.focus());
      }
    } catch (reason) { if (current === generation.current) setError(reason instanceof Error ? reason.message : "The folder could not be opened."); }
    finally { if (current === generation.current) setBusy(""); }
  }
  async function unlink(id: string) {
    if (!token || busy) return;
    const current = generation.current; setBusy("unlink"); setError(""); setNotice("");
    try {
      await request(`/api/repositories/${id}`, token, "DELETE");
      if (current !== generation.current) return;
      setRepositories(previous => previous.filter(item => item.id !== id)); if (selected?.id === id) setSelected(null);
      setConfirm(null); setNotice("Repository unlinked. Your saved reviews are kept.");
    } catch (reason) { if (current === generation.current) setError(reason instanceof Error ? reason.message : "The link could not be removed."); }
    finally { if (current === generation.current) setBusy(""); }
  }
  return <div className="repository-workspace">
    <RepositoryHeader/>
    {!authReady ? <div className="panel center-state" role="status"><LoaderCircle className="spin"/>Opening your workspace…</div>
      : !configured || !token ? <section className="repo-access panel">
        <span className="repo-access-icon">{configured ? <Link2 size={24}/> : <Github size={24}/>}</span>
        <div>
          <h2>{configured ? "Sign in to link a repository" : "Repository linking needs account setup"}</h2>
          <p>{configured ? "Save repository links to your account and choose files to review." : "Account sign-in is unavailable. You can paste code into the practice studio."}</p>
        </div>
        <button className={configured ? "button primary" : "button light"} onClick={configured ? onSignIn : onPractice}>
          {configured ? <Github size={17}/> : <Code2 size={17}/>}
          {configured ? "Sign in" : "Open practice studio"}
        </button>
      </section> : <>
      <form className="repo-link-form panel" onSubmit={link}>
        <label htmlFor="repository-url">Link a public repository</label>
        <div>
          <span className="repo-input-icon"><Link2 size={18}/></span>
          <input id="repository-url" type="url" required maxLength={300} autoCapitalize="none" spellCheck={false} aria-describedby="repo-link-hint"
            placeholder="https://github.com/owner/repository" value={url} onChange={event => setUrl(event.target.value)}/>
          <button className="button primary" disabled={!!busy || !url.trim()}>
            {busy === "link" ? <LoaderCircle className="spin" size={17}/> : <Plus size={17}/>}
            {busy === "link" ? "Linking…" : "Link repository"}
          </button>
        </div>
        <p id="repo-link-hint">Only you can see your saved links. Files open as editable copies in the studio.</p>
      </form>
      {error && <div className="alert" role="alert"><CircleAlert size={18}/>{error}</div>}
      {notice && <p className="repo-notice" role="status"><Check size={16}/>{notice}</p>}
      <div className="repo-section-title">
        <h2>Linked repositories {busy !== "loading" && (!error || repositories.length > 0) && <span>{repositories.length}</span>}</h2>
        <button className="text-button" disabled={!!busy} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={15}/>Refresh</button>
      </div>
      {busy === "loading" ? <div className="repo-skeleton-grid" role="status" aria-label="Loading repositories"><div/><div/><div/></div>
        : !repositories.length && !error ? <section className="panel repo-empty">
          <FolderOpen size={35}/><h2>No linked repositories yet</h2><p>Paste a public GitHub URL above to browse its source files.</p>
        </section> : <div className="repo-grid">{repositories.map(repo => {
          const [owner, name] = repo.fullName.split("/");
          const isSelected = selected?.id === repo.id;
          return <article className={`repo-card panel ${isSelected ? "repo-selected" : ""}`} key={repo.id}>
            <div className="repo-card-top">
              <span className="repo-book"><BookOpen size={20}/></span>
              <a href={repo.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${repo.fullName} on GitHub`}><ExternalLink size={16}/></a>
            </div>
            <h3><small>{owner} /</small>{name}</h3>
            {repo.description && <p>{repo.description}</p>}
            <div className="repo-meta">
              <span><GitBranch size={13}/>{repo.defaultBranch}</span>{repo.language && <span><Code2 size={13}/>{repo.language}</span>}
            </div>
            <div className="repo-card-actions">
              <button className="button light" disabled={!!busy} onClick={() => browse(repo)}>
                {busy === "browse" && isSelected ? <LoaderCircle className="spin" size={16}/> : <FolderOpen size={16}/>}Browse files
              </button>
              <button className="icon-button" disabled={!!busy} aria-label={`Unlink ${repo.fullName}`} aria-expanded={confirm === repo.id} onClick={() => setConfirm(confirm === repo.id ? null : repo.id)}><Unlink size={17}/></button>
            </div>
            {confirm === repo.id && <div className="unlink-confirm">
              <p>Remove this link? Saved reviews will stay.</p>
              <button className="text-button" disabled={!!busy} onClick={() => unlink(repo.id)}>Unlink repository</button>
              <button className="text-button" disabled={!!busy} onClick={() => setConfirm(null)}>Keep it</button>
            </div>}
          </article>;
        })}</div>}
      {selected && <section className="panel repo-browser" aria-labelledby="browser-title">
        <div className="panel-head">
          <span className="panel-icon mint"><FolderOpen size={19}/></span>
          <h2 id="browser-title" ref={browserHeading} tabIndex={-1}>{selected.fullName}<span className="sr-only">, {path || "root folder"}</span></h2>
          <span className="browser-branch"><GitBranch size={13}/>{selected.defaultBranch}</span>
        </div>
        <nav className="repo-path" aria-label="Repository folders">
          {["Root", ...(path ? path.split("/") : [])].map((name, i, folders) => <span key={i}>
            {i > 0 && <ChevronRight size={13}/>}
            {i === folders.length - 1 ? <strong aria-current="location">{name}</strong> :
              <button disabled={!!busy} onClick={() => browse(selected, folders.slice(1, i + 1).join("/"))}>{name}</button>}
          </span>)}
        </nav>
        <p className="repo-browser-note">Choose a source file to import into the editor.</p>
        {busy === "browse" && <p className="repo-browse-loading" role="status"><LoaderCircle className="spin" size={17}/>Opening…</p>}
        <div className="repo-file-list" key={selected.id + "/" + path}>{entries.map(entry => {
          const folder = entry.type === "dir";
          const unavailable = !folder && (!entry.language || entry.size > 64000);
          return <button key={entry.path} disabled={!!busy || unavailable} onClick={() => browse(selected, entry.path)}>
            {folder ? <Folder size={18}/> : <FileCode2 size={18}/>}<span>{entry.name}</span>
            <small>{folder ? "Folder" : !entry.language ? "Unsupported file" : entry.size > 64000 ? "Too large" : `Import ${entry.language}`}</small>
          </button>;
        })}</div>
        {!entries.length && !busy && !error && <p className="repo-browser-note">This folder has no browsable files.</p>}
        {truncated && <p className="repo-browser-note">Showing up to 200 entries.</p>}
      </section>}
    </>}
  </div>;
}
