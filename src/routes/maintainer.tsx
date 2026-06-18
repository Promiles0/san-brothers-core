import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  ClipboardCheck,
  Cloud,
  Database,
  ExternalLink,
  FileClock,
  Github,
  GitCommit,
  Globe,
  Loader2,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Users as UsersIcon,
  Wrench,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/maintainer")({ component: MaintainerPage });

const MAINTAINER_EMAIL = "aroi.dev00@gmail.com";
const REPO = "Promiles0/san-brothers-core";
const LIVE_URL = "https://san-brothers.aroi-dev00.workers.dev/";
const SUPABASE_DASH = "https://app.supabase.com/project/hokqzznlvudldmrgpfhd";
const CF_DASH = "https://dash.cloudflare.com/";
const GH_REPO_URL = `https://github.com/${REPO}`;
const GH_ISSUES_URL = `${GH_REPO_URL}/issues`;

function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "—";
  const s = Math.max(1, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

function trunc(s: string | null | undefined, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function MaintainerPage() {
  return (
    <MaintainerGuard>
      <MaintainerConsole />
    </MaintainerGuard>
  );
}

function MaintainerGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading, user } = useAuth() as {
    profile: { email?: string | null } | null;
    loading: boolean;
    user: { email?: string | null } | null;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  const email = profile?.email ?? user?.email ?? null;

  if (!email) {
    if (typeof window !== "undefined") {
      window.location.href = "/login?redirect=/maintainer";
    }
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (email !== MAINTAINER_EMAIL) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-zinc-950 text-center px-6">
        <ShieldAlert className="h-10 w-10 text-red-500" />
        <h1 className="text-xl font-bold text-white">Access Restricted</h1>
        <p className="text-sm text-zinc-400 max-w-sm">
          This area is restricted to the platform maintainer.
        </p>
        <Button
          variant="outline"
          className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
          onClick={() => (window.location.href = "/")}
        >
          Return Home
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

/* ============================== TYPES ============================== */

type Status = "ok" | "warn" | "down" | "loading";

interface SiteHealth {
  status: Status;
  latencyMs: number | null;
  checkedAt: number | null;
  error?: string;
}

interface DbHealth {
  status: Status;
  latencyMs: number | null;
  checkedAt: number | null;
  error?: string;
}

interface GhCommit {
  sha: string;
  message: string;
  authorName: string;
  authorLogin?: string;
  authorAvatar?: string;
  date: string;
  url: string;
}

interface RepoStats {
  openIssues: number;
  defaultBranch: string;
  pushedAt: string;
}

interface DbCounts {
  users: number | null;
  service_requests: number | null;
  payments: number | null;
  messages: number | null;
  audit_log: number | null;
}

interface Recent {
  signup: { email: string; created_at: string } | null;
  payment: { amount_rwf: number | null; created_at: string } | null;
  caseItem: { service_category: string | null; created_at: string } | null;
}

interface AuditRow {
  id: string;
  action: string;
  target_id: string | null;
  target_type: string | null;
  user_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

/* ============================== CONSOLE ============================== */

function MaintainerConsole() {
  const [now, setNow] = useState<number>(Date.now());
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [refreshing, setRefreshing] = useState(false);

  const [site, setSite] = useState<SiteHealth>({
    status: "loading",
    latencyMs: null,
    checkedAt: null,
  });
  const [db, setDb] = useState<DbHealth>({ status: "loading", latencyMs: null, checkedAt: null });

  const [commits, setCommits] = useState<GhCommit[] | null>(null);
  const [commitsError, setCommitsError] = useState<string | null>(null);
  const [repoStats, setRepoStats] = useState<RepoStats | null>(null);
  const [repoError, setRepoError] = useState<string | null>(null);

  const [counts, setCounts] = useState<DbCounts>({
    users: null,
    service_requests: null,
    payments: null,
    messages: null,
    audit_log: null,
  });
  const [recent, setRecent] = useState<Recent>({ signup: null, payment: null, caseItem: null });

  const [audit, setAudit] = useState<AuditRow[] | null>(null);
  const [auditUsers, setAuditUsers] = useState<Record<string, string>>({});
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState<"all" | "pricing" | "staff" | "case">("all");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ticking clock
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ---------- fetchers ---------- */

  const checkSite = useCallback(async () => {
    const start = performance.now();
    try {
      await fetch(LIVE_URL, { method: "HEAD", mode: "no-cors", cache: "no-store" });
      const latency = Math.round(performance.now() - start);
      setSite({
        status: latency > 2000 ? "warn" : "ok",
        latencyMs: latency,
        checkedAt: Date.now(),
      });
    } catch (e) {
      setSite({
        status: "down",
        latencyMs: null,
        checkedAt: Date.now(),
        error: e instanceof Error ? e.message : "Unreachable",
      });
    }
  }, []);

  const checkDb = useCallback(async () => {
    const start = performance.now();
    try {
      const { error } = await supabase
        .from("users")
        .select("id", { head: true, count: "exact" })
        .limit(1);
      const latency = Math.round(performance.now() - start);
      if (error) {
        setDb({ status: "down", latencyMs: null, checkedAt: Date.now(), error: error.message });
      } else {
        setDb({
          status: latency > 1500 ? "warn" : "ok",
          latencyMs: latency,
          checkedAt: Date.now(),
        });
      }
    } catch (e) {
      setDb({
        status: "down",
        latencyMs: null,
        checkedAt: Date.now(),
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }, []);

  const loadCounts = useCallback(async () => {
    const tables: (keyof DbCounts)[] = [
      "users",
      "service_requests",
      "payments",
      "messages",
      "audit_log",
    ];
    const results = await Promise.all(
      tables.map(async (t) => {
        try {
          const { count, error } = await supabase
            .from(t)
            .select("id", { head: true, count: "exact" });
          if (error) return [t, null] as const;
          return [t, count ?? 0] as const;
        } catch {
          return [t, null] as const;
        }
      }),
    );
    const next = { ...counts };
    for (const [t, c] of results) (next as Record<string, number | null>)[t] = c;
    setCounts(next);

    // recent rows (best-effort)
    try {
      const [{ data: u }, { data: p }, { data: c }] = await Promise.all([
        supabase
          .from("users")
          .select("email, created_at")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("payments")
          .select("amount_rwf, created_at")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("service_requests")
          .select("service_category, created_at")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      setRecent({
        signup: u?.[0]
          ? {
              email: (u[0] as { email: string }).email,
              created_at: (u[0] as { created_at: string }).created_at,
            }
          : null,
        payment: p?.[0]
          ? {
              amount_rwf: (p[0] as { amount_rwf: number | null }).amount_rwf,
              created_at: (p[0] as { created_at: string }).created_at,
            }
          : null,
        caseItem: c?.[0]
          ? {
              service_category: (c[0] as { service_category: string | null }).service_category,
              created_at: (c[0] as { created_at: string }).created_at,
            }
          : null,
      });
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAudit = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, action, target_id, target_type, user_id, created_at, metadata")
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) {
        setAuditError(error.message);
        setAudit([]);
        return;
      }
      const rows = (data ?? []) as AuditRow[];
      setAudit(rows);
      setAuditError(null);

      const ids = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: users } = await supabase
          .from("users")
          .select("id, email, full_name")
          .in("id", ids);
        const map: Record<string, string> = {};
        for (const u of users ?? []) {
          const row = u as { id: string; email: string; full_name: string | null };
          map[row.id] = row.full_name || row.email;
        }
        setAuditUsers(map);
      }
    } catch (e) {
      setAuditError(e instanceof Error ? e.message : "Failed");
      setAudit([]);
    }
  }, []);

  const loadGitHub = useCallback(async () => {
    try {
      const r = await fetch(`https://api.github.com/repos/${REPO}/commits?per_page=5`);
      if (!r.ok) throw new Error(`GitHub ${r.status}`);
      const data = (await r.json()) as Array<{
        sha: string;
        commit: { message: string; author: { name: string; date: string } };
        author: { login: string; avatar_url: string } | null;
        html_url: string;
      }>;
      setCommits(
        data.map((c) => ({
          sha: c.sha.slice(0, 7),
          message: c.commit.message.split("\n")[0],
          authorName: c.commit.author.name,
          authorLogin: c.author?.login,
          authorAvatar: c.author?.avatar_url,
          date: c.commit.author.date,
          url: c.html_url,
        })),
      );
      setCommitsError(null);
    } catch (e) {
      setCommitsError(e instanceof Error ? e.message : "Failed");
      setCommits([]);
    }
    try {
      const r = await fetch(`https://api.github.com/repos/${REPO}`);
      if (!r.ok) throw new Error(`GitHub ${r.status}`);
      const data = (await r.json()) as {
        open_issues_count: number;
        default_branch: string;
        pushed_at: string;
      };
      setRepoStats({
        openIssues: data.open_issues_count,
        defaultBranch: data.default_branch,
        pushedAt: data.pushed_at,
      });
      setRepoError(null);
    } catch (e) {
      setRepoError(e instanceof Error ? e.message : "Failed");
      setRepoStats(null);
    }
  }, []);

  const refreshLive = useCallback(async () => {
    await Promise.all([checkSite(), checkDb(), loadCounts(), loadAudit()]);
    setLastRefresh(Date.now());
  }, [checkSite, checkDb, loadCounts, loadAudit]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshLive(), loadGitHub()]);
    } finally {
      setRefreshing(false);
      // restart interval
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(refreshLive, 60_000);
    }
  }, [refreshLive, loadGitHub]);

  // initial load + 60s interval for live data only
  useEffect(() => {
    void refreshAll();
    intervalRef.current = setInterval(() => {
      void refreshLive();
    }, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const secondsSinceRefresh = Math.floor((now - lastRefresh) / 1000);
  const clockStr = new Date(now).toLocaleTimeString();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/30">
              <Wrench className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                🛠 Maintainer Console
              </h1>
              <p className="text-[11px] text-zinc-500">Private cockpit · {MAINTAINER_EMAIL}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="font-mono text-sm text-zinc-200">{clockStr}</div>
              <div className="text-[11px] text-zinc-500">
                Last refreshed: {secondsSinceRefresh}s ago
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => void refreshAll()}
              disabled={refreshing}
              className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* SECTION 1 — SITE HEALTH */}
        <section>
          <SectionTitle icon={<Activity className="h-4 w-4" />} title="Site Health" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatusCard
              title="Live Site Status"
              status={site.status}
              checkedAt={site.checkedAt}
              icon={<Globe className="h-4 w-4" />}
              primary={
                site.status === "loading"
                  ? "Checking…"
                  : site.status === "down"
                    ? "Site Unreachable"
                    : `Site Online ~${site.latencyMs}ms`
              }
              secondary={site.error}
              link={LIVE_URL}
              linkLabel="Open site"
            />
            <StatusCard
              title="Supabase Connection"
              status={db.status}
              checkedAt={db.checkedAt}
              icon={<Database className="h-4 w-4" />}
              primary={
                db.status === "loading"
                  ? "Checking…"
                  : db.status === "down"
                    ? "Database Error"
                    : `Database Connected · ${db.latencyMs}ms`
              }
              secondary={db.error}
              link={SUPABASE_DASH}
              linkLabel="Open Supabase"
            />
            <StatusCard
              title="SSL / Domain"
              status="ok"
              checkedAt={Date.now()}
              icon={<ShieldCheck className="h-4 w-4" />}
              primary="Cloudflare Workers"
              secondary="Auto-renewed SSL · TLS 1.3"
              link={CF_DASH}
              linkLabel="Open Cloudflare Dashboard →"
            />
            <DeployCard
              latestCommit={commits?.[0] ?? null}
              error={commitsError}
              repoUrl={GH_REPO_URL}
            />
          </div>
        </section>

        {/* SECTION 2 — GITHUB ACTIVITY */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionTitle icon={<Github className="h-4 w-4" />} title="Recent Commits" />
            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
              {commits === null ? (
                <CardLoading />
              ) : commitsError ? (
                <CardError message={commitsError} />
              ) : commits.length === 0 ? (
                <div className="p-6 text-sm text-zinc-500">No commits found.</div>
              ) : (
                <ul className="divide-y divide-zinc-800">
                  {commits.map((c) => (
                    <li key={c.sha} className="flex items-start gap-3 p-3 sm:p-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-semibold text-cyan-300">
                        {c.authorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-sm font-medium text-zinc-100 hover:text-cyan-300"
                        >
                          {trunc(c.message, 60)}
                        </a>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500">
                          <span>{c.authorName}</span>
                          <span>·</span>
                          <span>{relTime(c.date)}</span>
                          <span>·</span>
                          <span className="font-mono">{c.sha}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <SectionTitle icon={<GitCommit className="h-4 w-4" />} title="Repo & Quick Links" />
            <div className="space-y-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                {repoError ? (
                  <CardError message={repoError} />
                ) : !repoStats ? (
                  <CardLoading />
                ) : (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <RepoStat label="Open Issues" value={String(repoStats.openIssues)} />
                    <RepoStat label="Branch" value={repoStats.defaultBranch} mono />
                    <RepoStat label="Last Push" value={relTime(repoStats.pushedAt)} />
                  </div>
                )}
              </div>
              <ExternalLinkButton href={GH_REPO_URL} icon={<Github className="h-4 w-4" />}>
                Open GitHub Repo
              </ExternalLinkButton>
              <ExternalLinkButton href={CF_DASH} icon={<Cloud className="h-4 w-4" />}>
                Open Cloudflare Dashboard
              </ExternalLinkButton>
              <ExternalLinkButton href={SUPABASE_DASH} icon={<Database className="h-4 w-4" />}>
                Open Supabase Dashboard
              </ExternalLinkButton>
            </div>
          </div>
        </section>

        {/* SECTION 3 — DATABASE SNAPSHOT */}
        <section>
          <SectionTitle icon={<Database className="h-4 w-4" />} title="Database Snapshot" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <MiniStat label="Users" value={counts.users} icon={<UsersIcon className="h-4 w-4" />} />
            <MiniStat
              label="Service Requests"
              value={counts.service_requests}
              icon={<FileClock className="h-4 w-4" />}
            />
            <MiniStat
              label="Payments"
              value={counts.payments}
              icon={<Activity className="h-4 w-4" />}
            />
            <MiniStat
              label="Messages"
              value={counts.messages}
              icon={<Activity className="h-4 w-4" />}
            />
            <MiniStat
              label="Audit Entries"
              value={counts.audit_log}
              icon={<ShieldCheck className="h-4 w-4" />}
            />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm sm:grid-cols-3">
            <RecentRow
              label="Latest signup"
              primary={recent.signup?.email ?? "—"}
              secondary={recent.signup ? relTime(recent.signup.created_at) : ""}
            />
            <RecentRow
              label="Latest payment"
              primary={
                recent.payment ? `${(recent.payment.amount_rwf ?? 0).toLocaleString()} RWF` : "—"
              }
              secondary={recent.payment ? relTime(recent.payment.created_at) : ""}
            />
            <RecentRow
              label="Latest case"
              primary={recent.caseItem?.service_category ?? "—"}
              secondary={recent.caseItem ? relTime(recent.caseItem.created_at) : ""}
            />
          </div>
        </section>

        {/* SECTION 4 — ERROR & AUDIT MONITOR */}
        <section>
          <SectionTitle icon={<FileClock className="h-4 w-4" />} title="Audit Monitor" />
          <div className="rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 p-3">
              {(
                [
                  ["all", "All"],
                  ["pricing", "Pricing Changes"],
                  ["staff", "Staff Changes"],
                  ["case", "Case Updates"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setAuditFilter(k)}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    auditFilter === k
                      ? "bg-cyan-500 text-zinc-950"
                      : "border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className="ml-auto text-[11px] text-zinc-500">last 15 entries</span>
            </div>
            <div className="bg-black/40 p-3 font-mono text-[12px] leading-relaxed">
              {audit === null ? (
                <div className="flex items-center gap-2 text-zinc-500">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading audit log…
                </div>
              ) : auditError ? (
                <div className="text-red-400">Error: {auditError}</div>
              ) : audit.length === 0 ? (
                <div className="text-zinc-500">No audit entries.</div>
              ) : (
                <ul className="space-y-1">
                  {audit
                    .filter((r) => filterMatches(r.action, auditFilter))
                    .map((r) => {
                      const name = r.user_id
                        ? (auditUsers[r.user_id] ?? r.user_id.slice(0, 8))
                        : "system";
                      const ts = new Date(r.created_at)
                        .toISOString()
                        .replace("T", " ")
                        .slice(0, 19);
                      return (
                        <li key={r.id} className="flex flex-wrap gap-x-2 break-all">
                          <span className="text-zinc-600">[{ts}]</span>
                          <span className="text-zinc-300">{name}</span>
                          <span className="text-zinc-600">→</span>
                          <span className={actionColor(r.action)}>{r.action}</span>
                          {r.target_type && (
                            <span className="text-zinc-500">
                              ({r.target_type}
                              {r.target_id ? `:${r.target_id.slice(0, 8)}` : ""})
                            </span>
                          )}
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
            <div className="border-t border-zinc-800 p-3 text-right">
              <Link to="/admin/audit" className="text-xs text-cyan-400 hover:text-cyan-300">
                View full audit log →
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION 5 — QUICK MAINTENANCE ACTIONS */}
        <section>
          <SectionTitle icon={<Wrench className="h-4 w-4" />} title="Quick Maintenance Actions" />
          <div className="space-y-4">
            <ActionGroup
              title="Content & Config"
              items={[
                { label: "Edit Services Catalog", to: "/admin/services" },
                { label: "Edit Pricing", to: "/admin/pricing" },
                { label: "Manage Staff", to: "/admin/staff" },
              ]}
            />
            <ActionGroup
              title="Data & Records"
              items={[
                { label: "View All Clients", to: "/admin/clients" },
                { label: "View All Cases", to: "/admin/cases" },
                { label: "Full Audit Log", to: "/admin/audit" },
              ]}
            />
            <ActionGroup
              title="External Tools"
              items={[
                { label: "Supabase Dashboard", href: SUPABASE_DASH },
                { label: "Cloudflare Workers", href: CF_DASH },
                { label: "GitHub Repository", href: GH_REPO_URL },
                { label: "GitHub Issues", href: GH_ISSUES_URL },
              ]}
            />
          </div>
        </section>

        {/* SECTION 6 — ENVIRONMENT & CONFIG REFERENCE */}
        <EnvReference />

        <footer className="pb-10 pt-4 text-center text-[11px] text-zinc-600">
          San Brothers · Maintainer Console · Built &amp; maintained by IRADUKUNDA Aroi Serge
        </footer>
      </main>
    </div>
  );
}

/* ============================== HELPERS ============================== */

function filterMatches(action: string, f: "all" | "pricing" | "staff" | "case") {
  if (f === "all") return true;
  const a = action.toLowerCase();
  if (f === "pricing")
    return a.includes("pricing") || a.includes("minute_package") || a.includes("price");
  if (f === "staff") return a.includes("staff") || a.includes("role_changed");
  if (f === "case")
    return a.includes("status_changed") || a.includes("case") || a.includes("note_added");
  return true;
}

function actionColor(action: string): string {
  const a = action.toLowerCase();
  if (a.includes("status_changed")) return "text-blue-400";
  if (a.includes("pricing")) return "text-amber-400";
  if (a.includes("staff_activated")) return "text-green-400";
  if (a.includes("staff_deactivated")) return "text-red-400";
  if (a.includes("role_changed")) return "text-purple-400";
  if (a.includes("minute_package")) return "text-orange-400";
  if (a.includes("note_added")) return "text-zinc-400";
  return "text-cyan-400";
}

function statusDot(status: Status) {
  const cls =
    status === "ok"
      ? "bg-green-500"
      : status === "warn"
        ? "bg-amber-500"
        : status === "down"
          ? "bg-red-500"
          : "bg-zinc-600";
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {(status === "ok" || status === "warn") && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${cls}`}
        />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${cls}`} />
    </span>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
      <span className="text-cyan-400">{icon}</span>
      {title}
    </div>
  );
}

function StatusCard({
  title,
  status,
  checkedAt,
  icon,
  primary,
  secondary,
  link,
  linkLabel,
}: {
  title: string;
  status: Status;
  checkedAt: number | null;
  icon: React.ReactNode;
  primary: string;
  secondary?: string;
  link?: string;
  linkLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="text-zinc-500">{icon}</span>
          {title}
        </div>
        {statusDot(status)}
      </div>
      <div className="mt-3 text-sm font-medium text-zinc-100">{primary}</div>
      {secondary && (
        <div className="mt-1 truncate text-[11px] text-zinc-500" title={secondary}>
          {secondary}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
        <span>{checkedAt ? `Checked ${relTime(new Date(checkedAt).toISOString())}` : "—"}</span>
        {link && linkLabel && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
          >
            {linkLabel} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function DeployCard({
  latestCommit,
  error,
  repoUrl,
}: {
  latestCommit: GhCommit | null;
  error: string | null;
  repoUrl: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Server className="h-4 w-4 text-zinc-500" />
          Deploy Status
        </div>
        {statusDot(error ? "warn" : latestCommit ? "ok" : "loading")}
      </div>
      {error ? (
        <div className="mt-3 text-sm text-amber-400">GitHub unavailable</div>
      ) : !latestCommit ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2 text-sm font-medium text-zinc-100">
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300">
              {latestCommit.sha}
            </span>
            <span className="truncate" title={latestCommit.message}>
              {trunc(latestCommit.message, 38)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">{relTime(latestCommit.date)}</div>
        </>
      )}
      <div className="mt-3 text-right text-[11px]">
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
        >
          View on GitHub <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function CardLoading() {
  return (
    <div className="flex items-center gap-2 p-6 text-sm text-zinc-500">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

function CardError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 p-4 text-sm text-amber-400">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function RepoStat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className={`text-sm font-semibold text-zinc-100 ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function ExternalLinkButton({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition hover:border-cyan-500/50 hover:bg-zinc-800"
    >
      <span className="flex items-center gap-2">
        <span className="text-cyan-400">{icon}</span>
        {children}
      </span>
      <ArrowUpRight className="h-4 w-4 text-zinc-500" />
    </a>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span className="text-cyan-400">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-zinc-100">
        {value === null ? "—" : value.toLocaleString()}
      </div>
    </div>
  );
}

function RecentRow({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 truncate text-sm text-zinc-100" title={primary}>
        {primary}
      </div>
      {secondary && <div className="text-[11px] text-zinc-500">{secondary}</div>}
    </div>
  );
}

interface ActionItem {
  label: string;
  to?: string;
  href?: string;
}

function ActionGroup({ title, items }: { title: string; items: ActionItem[] }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const inner = (
            <div className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition hover:border-cyan-500/50 hover:bg-zinc-800">
              <div className="flex items-center gap-2 text-sm text-zinc-200">
                <Wrench className="h-4 w-4 text-cyan-400" />
                {it.label}
              </div>
              <ArrowUpRight className="h-4 w-4 text-zinc-500 transition group-hover:text-cyan-400" />
            </div>
          );
          return it.href ? (
            <a
              key={it.label}
              href={it.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              {inner}
            </a>
          ) : (
            <Link key={it.label} to={it.to!} className="block">
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== ENV REFERENCE ============================== */

const ENV_TEXT = `PROJECT INFO
Live URL: san-brothers.aroi-dev00.workers.dev
GitHub: github.com/Promiles0/san-brothers-core
Supabase Project: hokqzznlvudldmrgpfhd
Stack: TanStack Start + Vite + Cloudflare Workers + Supabase + Bun

ENV VARS CONFIGURED (Cloudflare secrets)
VITE_SUPABASE_URL: SET
VITE_SUPABASE_ANON_KEY: SET
VITE_DAILY_CO_API_KEY: SET
VITE_STRIPE_PUBLISHABLE_KEY: SET
STRIPE_SECRET_KEY: SET
VITE_ANTHROPIC_API_KEY: NOT SET YET

PENDING INTEGRATIONS
- MTN MoMo (needs API key)
- PayPal (needs API key)
- SMS via Africa's Talking (needs API key)
- Email receipts via Resend (needs domain email)
- WeChat Sign In (needs account)
`;

function EnvReference() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ENV_TEXT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <section>
      <SectionTitle
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Environment & Config Reference"
      />
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-medium text-zinc-100">
              Project info, env vars &amp; pending integrations
            </span>
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          )}
        </button>
        {open && (
          <div className="border-t border-zinc-800 p-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-lg bg-zinc-950 p-3 text-xs text-zinc-300">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                  Project Info
                </div>
                <Kv k="Live URL" v="san-brothers.aroi-dev00.workers.dev" />
                <Kv k="GitHub" v="Promiles0/san-brothers-core" />
                <Kv k="Supabase" v="hokqzznlvudldmrgpfhd" />
                <Kv k="Stack" v="TanStack Start + Vite + CF Workers + Supabase + Bun" />
              </div>
              <div className="rounded-lg bg-zinc-950 p-3 text-xs text-zinc-300">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                  Env Vars (Cloudflare secrets)
                </div>
                <EnvLine k="VITE_SUPABASE_URL" ok />
                <EnvLine k="VITE_SUPABASE_ANON_KEY" ok />
                <EnvLine k="VITE_DAILY_CO_API_KEY" ok />
                <EnvLine k="VITE_STRIPE_PUBLISHABLE_KEY" ok />
                <EnvLine k="STRIPE_SECRET_KEY" ok />
                <EnvLine k="VITE_ANTHROPIC_API_KEY" ok={false} />
              </div>
              <div className="rounded-lg bg-zinc-950 p-3 text-xs text-zinc-300">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                  Pending Integrations
                </div>
                <ul className="space-y-1 text-zinc-400">
                  <li>· MTN MoMo (needs API key)</li>
                  <li>· PayPal (needs API key)</li>
                  <li>· SMS via Africa&apos;s Talking</li>
                  <li>· Email receipts via Resend</li>
                  <li>· WeChat Sign In</li>
                </ul>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={copy}
                className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
              >
                {copied ? (
                  <>
                    <ClipboardCheck className="mr-2 h-4 w-4 text-green-400" /> Copied
                  </>
                ) : (
                  <>
                    <Clipboard className="mr-2 h-4 w-4" /> Copy as text
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-zinc-500">{k}</span>
      <span className="truncate text-right font-mono text-zinc-200">{v}</span>
    </div>
  );
}

function EnvLine({ k, ok }: { k: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5 font-mono">
      <span className="truncate text-zinc-300">{k}</span>
      {ok ? (
        <span className="inline-flex items-center gap-1 text-green-400">
          <Check className="h-3 w-3" /> SET
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-amber-400">
          <AlertTriangle className="h-3 w-3" /> NOT SET
        </span>
      )}
    </div>
  );
}
