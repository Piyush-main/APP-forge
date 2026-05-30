"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface App {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  status: "draft" | "active" | "error";
  createdAt: string;
  updatedAt: string;
  _count: { deploys: number };
}

const STATUS_STYLES = {
  active: "forge-badge-green",
  draft:  "forge-badge-amber",
  error:  "forge-badge-red",
} as const;

export default function DashboardPage() {
  const [apps, setApps]       = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    fetch("/api/apps")
      .then((r) => r.json())
      .then((d) => { if (d.success) setApps(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = apps.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-forge-bg">
      {/* Topbar */}
      <header className="h-12 bg-forge-bg2 border-b border-forge-border flex items-center px-6 gap-4 sticky top-0 z-10">
        <Link href="/" className="font-display font-extrabold text-lg text-gradient">AppForge</Link>
        <span className="text-gray-600">/</span>
        <span className="text-sm text-gray-400">My Apps</span>
        <div className="ml-auto flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search apps..."
            className="forge-input text-xs py-1.5 px-3 w-52"
          />
          <Link href="/builder" className="forge-btn-primary text-sm">
            + New App
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Apps",   value: apps.length,                                   color: "text-forge-accent2" },
            { label: "Active",       value: apps.filter((a) => a.status === "active").length, color: "text-green-400"    },
            { label: "Deployments",  value: apps.reduce((s, a) => s + a._count.deploys, 0), color: "text-sky-400"      },
          ].map((stat) => (
            <div key={stat.label} className="forge-panel p-5">
              <div className={`font-display font-bold text-3xl ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* App grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="forge-panel p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-forge-bg3" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-forge-bg3 rounded w-3/4" />
                    <div className="h-2.5 bg-forge-bg3 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-2 bg-forge-bg3 rounded w-full mb-2" />
                <div className="h-2 bg-forge-bg3 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyApps hasSearch={!!search} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((app) => <AppCard key={app.id} app={app} />)}
          </div>
        )}
      </main>
    </div>
  );
}

function AppCard({ app }: { app: App }) {
  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="forge-panel p-5 hover:border-forge-border2 transition-all group">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600/20 to-sky-500/20 flex items-center justify-center text-2xl shrink-0">
          {app.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-base leading-tight truncate">{app.name}</div>
          <div className="text-xs text-gray-500 mt-0.5 truncate">{app.description}</div>
        </div>
        <span className={`forge-badge ${STATUS_STYLES[app.status]} shrink-0`}>{app.status}</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
        <span>🚀 {app._count.deploys} deploy{app._count.deploys !== 1 ? "s" : ""}</span>
        <span className="ml-auto">Updated {timeAgo(app.updatedAt)}</span>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/apps/${app.id}`}
          className="forge-btn-ghost text-xs py-1.5 px-3 flex-1 justify-center"
        >
          Open
        </Link>
        <Link
          href={`/builder?app=${app.id}`}
          className="forge-btn-ghost text-xs py-1.5 px-3 flex-1 justify-center"
        >
          Edit Config
        </Link>
      </div>
    </div>
  );
}

function EmptyApps({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">{hasSearch ? "🔍" : "⚡"}</div>
      <h2 className="font-display font-bold text-xl mb-2">
        {hasSearch ? "No matching apps" : "No apps yet"}
      </h2>
      <p className="text-gray-400 text-sm max-w-xs mb-6">
        {hasSearch
          ? "Try a different search term."
          : "Create your first app by dropping a JSON config into the builder."}
      </p>
      {!hasSearch && (
        <Link href="/builder" className="forge-btn-primary">
          ⚡ Open Builder
        </Link>
      )}
    </div>
  );
}
