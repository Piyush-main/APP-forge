"use client";

import { useState, useCallback, useRef } from "react";
import type { GenerationResult } from "@/types/config";

// ─── Sample configs ───────────────────────────────────────────────────────
const SAMPLES = {
  crm: {
    label: "CRM Platform 🚀",
    config: {
      app: { name: "SalesCRM", icon: "🚀", description: "Customer Relationship Management", theme: "dark", version: "1.0.0" },
      auth: { providers: ["email", "google", "github"], roles: ["admin", "sales", "viewer"] },
      database: {
        models: [
          { name: "Contact", fields: [{ name: "name", type: "string", required: true }, { name: "email", type: "email", required: true }, { name: "company", type: "string" }, { name: "status", type: "enum", values: ["lead", "prospect", "customer"], default: "lead" }, { name: "value", type: "number" }] },
          { name: "Deal", fields: [{ name: "title", type: "string", required: true }, { name: "amount", type: "number" }, { name: "stage", type: "enum", values: ["discovery", "proposal", "closed_won", "closed_lost"] }, { name: "contact_id", type: "relation", model: "Contact" }] },
        ],
      },
      pages: [
        { name: "Dashboard", icon: "📊", type: "dashboard", metrics: [{ label: "Contacts", field: "Contact.count" }, { label: "Deals", field: "Deal.count" }, { label: "Pipeline", field: "Deal.sum.amount", prefix: "$" }] },
        { name: "Contacts", icon: "👥", type: "table", model: "Contact", actions: ["create", "edit", "delete", "import_csv"] },
        { name: "Deals", icon: "💼", type: "table", model: "Deal", actions: ["create", "edit"] },
      ],
      workflows: [{ name: "New Lead Alert", trigger: "Contact.create", condition: "status == lead", action: "notify", template: "New lead: {{name}} from {{company}}" }],
    },
  },
  broken: {
    label: "Broken Config (Test) 🧪",
    config: {
      app: { name: "", icon: null, unknown_field: "ignored" },
      database: { models: [{ name: "User", fields: [{ name: "email", type: "INVALID_TYPE" }, { name: "age", type: "number", default: "not-a-number" }] }, null, { name: "Post", fields: null }] },
      pages: [null, { type: "unknown_type" }, { name: "Valid", type: "dashboard" }],
    },
  },
} as const;

type Tab = "preview" | "schema" | "routes" | "auth" | "deploy";

export default function BuilderPage() {
  const [json, setJson]           = useState(JSON.stringify(SAMPLES.crm.config, null, 2));
  const [result, setResult]       = useState<GenerationResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [tab, setTab]             = useState<Tab>("preview");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [logs, setLogs]           = useState<{ level: string; msg: string; time: string }[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((level: string, msg: string) => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs((prev) => [...prev.slice(-49), { level, msg, time }]);
    setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 50);
  }, []);

  const handleJsonChange = (val: string) => {
    setJson(val);
    try { JSON.parse(val); setJsonError(null); }
    catch (e) { setJsonError((e as Error).message.split("\n")[0]); }
  };

  const generate = async () => {
    let parsed: unknown;
    try { parsed = JSON.parse(json); }
    catch { addLog("err", "Invalid JSON — fix syntax errors first"); return; }

    setLoading(true);
    addLog("info", "Sending config to runtime...");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: parsed }),
      });
      const data = await res.json();

      if (!data.success) {
        addLog("err", `Generation failed: ${data.error}`);
        return;
      }

      const r: GenerationResult = data.data;
      setResult(r);

      r.validation.errors.forEach((e) => addLog("err", `${e.path}: ${e.message}`));
      r.validation.warnings.forEach((w) => addLog("warn", `${w.path}: ${w.message}${w.autoFixed ? ` → ${w.fixDescription}` : ""}`));
      addLog("ok", `App "${r.config.app.name}" generated — ${r.schemas.length} models, ${r.routes.length} routes`);
    } catch (e) {
      addLog("err", `Network error: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (key: keyof typeof SAMPLES) => {
    setJson(JSON.stringify(SAMPLES[key].config, null, 2));
    setJsonError(null);
  };

  return (
    <div className="flex flex-col h-screen bg-forge-bg overflow-hidden">
      {/* Top bar */}
      <header className="h-12 bg-forge-bg2 border-b border-forge-border flex items-center px-4 gap-3 shrink-0">
        <a href="/" className="font-display font-extrabold text-lg text-gradient">AppForge</a>
        <span className="text-gray-600">/</span>
        <span className="text-sm text-gray-400">Builder</span>
        <div className="flex items-center gap-2 ml-auto">
          {(["preview","schema","routes","auth","deploy"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t ? "bg-forge-accent/20 text-forge-accent2" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Editor */}
        <div className="w-96 shrink-0 border-r border-forge-border flex flex-col bg-forge-bg2">
          {/* Samples bar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-forge-border">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Samples</span>
            {Object.entries(SAMPLES).map(([k, s]) => (
              <button
                key={k}
                onClick={() => loadSample(k as keyof typeof SAMPLES)}
                className="text-xs px-2 py-1 rounded bg-forge-bg3 hover:bg-forge-bg4 text-gray-300 transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Editor */}
          <div className="flex-1 relative overflow-hidden">
            <textarea
              value={json}
              onChange={(e) => handleJsonChange(e.target.value)}
              spellCheck={false}
              className="w-full h-full bg-transparent resize-none outline-none font-code text-[12.5px] leading-relaxed text-purple-300 p-4 caret-sky-400"
              style={{ colorScheme: "dark" }}
            />
          </div>

          {/* Status + generate */}
          <div className="px-3 py-2 border-t border-forge-border flex items-center gap-2">
            <span className={`text-xs font-code ${jsonError ? "text-red-400" : "text-green-400"}`}>
              {jsonError ? `✗ ${jsonError.slice(0, 38)}` : "✓ Valid JSON"}
            </span>
            <button
              onClick={generate}
              disabled={!!jsonError || loading}
              className="ml-auto forge-btn-primary text-xs py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "⏳ Generating..." : "⚡ Generate"}
            </button>
          </div>

          {/* Log panel */}
          <div
            ref={logRef}
            className="h-32 border-t border-forge-border bg-forge-bg overflow-y-auto p-2"
          >
            {logs.length === 0 && (
              <p className="text-gray-600 text-xs p-1">Runtime log will appear here...</p>
            )}
            {logs.map((l, i) => (
              <div key={i} className="flex gap-2 text-[11px] leading-5 font-code">
                <span className="text-gray-600 shrink-0">{l.time}</span>
                <span className={
                  l.level === "err" ? "text-red-400" :
                  l.level === "warn" ? "text-amber-400" :
                  l.level === "ok" ? "text-green-400" : "text-sky-400"
                }>[{l.level.toUpperCase()}]</span>
                <span className="text-gray-400">{l.msg}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Output panel */}
        <div className="flex-1 overflow-auto p-6">
          {!result ? (
            <EmptyState onGenerate={generate} />
          ) : (
            <>
              {tab === "preview" && <PreviewTab result={result} />}
              {tab === "schema"  && <SchemaTab  result={result} />}
              {tab === "routes"  && <RoutesTab  result={result} />}
              {tab === "auth"    && <AuthTab    result={result} />}
              {tab === "deploy"  && <DeployTab  result={result} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-4">
      <div className="text-5xl">⚡</div>
      <h2 className="font-display font-bold text-2xl">Paste JSON. Generate App.</h2>
      <p className="text-gray-400 max-w-sm text-sm leading-relaxed">
        Edit the configuration on the left, then click Generate to see your full-stack app materialize.
      </p>
      <button onClick={onGenerate} className="forge-btn-primary">⚡ Generate Now</button>
    </div>
  );
}

function ValidationBanners({ result }: { result: GenerationResult }) {
  return (
    <>
      {result.validation.errors.length > 0 && (
        <div className="flex items-start gap-2 bg-red-500/8 border border-red-500/25 rounded-lg p-3 mb-4 text-sm text-red-400">
          <span>⚠</span>
          <span>{result.validation.errors.length} error(s) — auto-handled: {result.validation.errors.slice(0,2).map(e => e.fixDescription || e.message).join(" · ")}</span>
        </div>
      )}
      {result.validation.warnings.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/25 rounded-lg p-3 mb-4 text-sm text-amber-400">
          <span>ℹ</span>
          <span>{result.validation.warnings.length} warning(s) gracefully handled</span>
        </div>
      )}
    </>
  );
}

function PreviewTab({ result }: { result: GenerationResult }) {
  const { config } = result;
  const [activePage, setActivePage] = useState(0);
  const page = config.pages[activePage];

  return (
    <div className="max-w-4xl animate-slide-up">
      <ValidationBanners result={result} />

      {/* App header */}
      <div className="forge-panel p-5 mb-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600/30 to-sky-500/30 flex items-center justify-center text-2xl shrink-0">
          {config.app.icon}
        </div>
        <div>
          <h1 className="font-display font-bold text-xl">{config.app.name}</h1>
          <p className="text-gray-400 text-sm">{config.app.description} · v{config.app.version}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <span className="forge-badge forge-badge-green border border-green-500/20">✓ Active</span>
          <span className="forge-badge forge-badge-blue border border-blue-500/20">🌐 i18n</span>
          <span className="forge-badge forge-badge-purple border border-purple-500/20">📱 PWA</span>
        </div>
      </div>

      {/* Nav */}
      {config.pages.length > 0 && (
        <div className="flex gap-1 mb-4 bg-forge-bg2 border border-forge-border rounded-lg p-1.5 overflow-x-auto">
          {config.pages.map((p, i) => (
            <button
              key={i}
              onClick={() => setActivePage(i)}
              className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-all ${
                activePage === i ? "bg-forge-accent text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {p.icon} {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Page content */}
      <div className="forge-panel p-5">
        {page?.type === "dashboard" && <DashboardPage page={page} config={config} />}
        {page?.type === "table" && <TablePage page={page} config={config} />}
        {page?.type === "settings" && <SettingsPage config={config} />}
        {(!page || (page.type !== "dashboard" && page.type !== "table" && page.type !== "settings")) && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-3xl mb-2">🔧</div>
            <p className="text-sm">Page type "{page?.type}" — rendered as placeholder</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardPage({ page, config }: { page: any; config: any }) {
  const sampleValues: Record<string, number> = {
    "Contact.count": 142, "Deal.count": 38, "Deal.sum.amount": 284500,
    "Product.count": 89, "Post.count": 24, "Comment.count": 67,
  };

  return (
    <div>
      {page.metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {page.metrics.map((m: any, i: number) => {
            const val = sampleValues[m.field] ?? Math.floor(Math.random() * 200 + 10);
            const formatted = m.prefix ? `${m.prefix}${val.toLocaleString()}` : val.toLocaleString();
            return (
              <div key={i} className="bg-forge-bg3 border border-forge-border rounded-xl p-4">
                <div className="font-display font-bold text-2xl">{formatted}</div>
                <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{m.label}</div>
                <div className="text-xs text-green-400 mt-1">↑ {(Math.random() * 15 + 2).toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      )}
      {config.workflows?.length > 0 && (
        <div>
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Active Workflows</h3>
          <div className="space-y-2">
            {config.workflows.map((wf: any, i: number) => (
              <div key={i} className="flex items-center gap-3 bg-forge-bg3 border border-forge-border rounded-lg p-3">
                <div className="w-6 h-6 rounded-full bg-forge-accent flex items-center justify-center text-xs font-bold text-white shrink-0">{i+1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{wf.name}</div>
                  <div className="text-xs text-gray-500 font-code">{wf.trigger}{wf.condition ? ` · when: ${wf.condition}` : ""}</div>
                </div>
                <span className="forge-badge forge-badge-green border border-green-500/20">🔔 active</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TablePage({ page, config }: { page: any; config: any }) {
  const model = config.database.models.find((m: any) => m.name === page.model) || config.database.models[0];
  if (!model) return <div className="text-gray-500 text-sm">No model found</div>;

  const sampleNames = ["Alice Chen", "Bob Martinez", "Carol Singh", "David Kim", "Eva Okonkwo", "Frank Zhao"];
  const rows = Array.from({ length: 5 }, (_, i) => {
    const r: Record<string, unknown> = {};
    model.fields.forEach((f: any) => {
      if (f.type === "string" && f.name === "name") r[f.name] = sampleNames[i];
      else if (f.type === "email") r[f.name] = `${sampleNames[i].split(" ")[0].toLowerCase()}@example.com`;
      else if (f.type === "enum" && f.values) r[f.name] = f.values[i % f.values.length];
      else if (f.type === "number") r[f.name] = Math.floor(Math.random() * 9000 + 1000);
      else if (f.type === "string") r[f.name] = `Value ${i + 1}`;
      else r[f.name] = "—";
    });
    return r;
  });

  const visibleFields = model.fields.slice(0, 5);
  const statusColors: Record<string, string> = { lead: "blue", prospect: "amber", customer: "green", closed_won: "green", closed_lost: "red", draft: "amber", published: "green" };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="font-medium">{model.name} Records</h3>
        <span className="text-xs text-gray-500">{Math.floor(Math.random() * 200 + 50)} total</span>
        <div className="ml-auto flex gap-2">
          {page.actions?.includes("import_csv") && (
            <button className="forge-btn-ghost text-xs py-1 px-2">📥 Import CSV</button>
          )}
          {page.actions?.includes("create") && (
            <button className="forge-btn-primary text-xs py-1 px-2">+ New {model.name}</button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-forge-border">
              {visibleFields.map((f: any) => (
                <th key={f.name} className="text-left py-2 px-3 text-xs text-gray-500 uppercase tracking-wider font-medium">{f.name}</th>
              ))}
              <th className="text-left py-2 px-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-forge-border/50 hover:bg-forge-bg3 transition-colors">
                {visibleFields.map((f: any) => (
                  <td key={f.name} className="py-2.5 px-3 text-gray-300">
                    {f.type === "enum" ? (
                      <span className={`forge-badge forge-badge-${statusColors[String(row[f.name])] || "blue"}`}>
                        {String(row[f.name])}
                      </span>
                    ) : f.type === "number" && (f.name.includes("amount") || f.name.includes("value")) ? (
                      `$${Number(row[f.name]).toLocaleString()}`
                    ) : (
                      String(row[f.name] ?? "—")
                    )}
                  </td>
                ))}
                <td className="py-2.5 px-3">
                  <div className="flex gap-1">
                    {page.actions?.includes("edit") && <button className="forge-btn-ghost text-xs py-0.5 px-2">Edit</button>}
                    {page.actions?.includes("delete") && <button className="text-xs py-0.5 px-2 rounded bg-red-500/10 text-red-400 border border-red-500/20">Del</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsPage({ config }: { config: any }) {
  return (
    <div className="max-w-lg space-y-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1">App Name</label>
        <input defaultValue={config.app.name} className="forge-input w-full" />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Description</label>
        <input defaultValue={config.app.description} className="forge-input w-full" />
      </div>
      <div className="border-t border-forge-border pt-4">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Auth Providers</div>
        <div className="flex gap-2 flex-wrap">
          {config.auth.providers.map((p: string) => (
            <span key={p} className="forge-badge forge-badge-blue border border-blue-500/20 px-3 py-1">{p}</span>
          ))}
        </div>
      </div>
      <button className="forge-btn-primary">Save Settings</button>
    </div>
  );
}

function SchemaTab({ result }: { result: GenerationResult }) {
  return (
    <div className="max-w-4xl animate-slide-up space-y-6">
      <ValidationBanners result={result} />
      {result.schemas.map((s, i) => (
        <div key={i} className="forge-panel overflow-hidden">
          <div className="px-4 py-3 border-b border-forge-border flex items-center gap-3">
            <span className="font-code text-sm text-forge-accent2">model {s.model.name}</span>
            <span className="text-xs text-gray-500">{s.model.fields.length} fields</span>
            <span className="text-xs text-gray-500 ml-auto font-code">table: {s.tableName}</span>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-forge-border/50">
              {["Field","Type","Constraints","Default"].map(h => (
                <th key={h} className="text-left py-2 px-4 text-xs text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {s.model.fields.map((f, fi) => (
                <tr key={fi} className="border-b border-forge-border/30 hover:bg-forge-bg3">
                  <td className="py-2 px-4 font-code text-sky-300">{f.name}</td>
                  <td className="py-2 px-4"><span className="forge-badge forge-badge-blue">{f.type}</span></td>
                  <td className="py-2 px-4 space-x-1">
                    {f.required && <span className="forge-badge forge-badge-amber">required</span>}
                    {f.unique && <span className="forge-badge forge-badge-purple">unique</span>}
                  </td>
                  <td className="py-2 px-4 font-code text-xs text-gray-500">
                    {f.default !== undefined ? JSON.stringify(f.default) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <details className="border-t border-forge-border">
            <summary className="px-4 py-2 text-xs text-gray-500 cursor-pointer hover:text-gray-300">
              View Prisma Model
            </summary>
            <pre className="px-4 py-3 font-code text-xs text-purple-300 bg-forge-bg overflow-x-auto">{s.prismaModel}</pre>
          </details>
        </div>
      ))}
    </div>
  );
}

function RoutesTab({ result }: { result: GenerationResult }) {
  const methodColor: Record<string, string> = {
    GET: "forge-badge-green", POST: "forge-badge-blue", PUT: "forge-badge-amber", DELETE: "forge-badge-red", PATCH: "forge-badge-purple",
  };
  const byModel: Record<string, typeof result.routes> = {};
  result.routes.forEach(r => {
    const key = r.model || "platform";
    if (!byModel[key]) byModel[key] = [];
    byModel[key].push(r);
  });

  return (
    <div className="max-w-4xl animate-slide-up space-y-4">
      {Object.entries(byModel).map(([model, routes]) => (
        <div key={model} className="forge-panel overflow-hidden">
          <div className="px-4 py-2.5 border-b border-forge-border font-code text-xs text-gray-400">
            {model === "platform" ? "/api/**" : `/api/${model.toLowerCase()}s/**`}
          </div>
          {routes.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-forge-border/30 hover:bg-forge-bg3">
              <span className={`forge-badge ${methodColor[r.method] || "forge-badge-blue"} w-14 justify-center`}>{r.method}</span>
              <span className="font-code text-xs text-sky-300 flex-1">{r.path}</span>
              <span className="text-xs text-gray-500">{r.description}</span>
              {r.feature && <span className="forge-badge forge-badge-purple text-[10px]">{r.feature}</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function AuthTab({ result }: { result: GenerationResult }) {
  const { config } = result;
  const providerIcons: Record<string, string> = { email: "✉️", google: "🔵", github: "⚫", facebook: "🔷" };

  return (
    <div className="max-w-2xl animate-slide-up space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {config.auth.providers.map(p => (
          <div key={p} className="forge-panel p-4 flex items-center gap-3">
            <span className="text-xl">{providerIcons[p] || "🔑"}</span>
            <div>
              <div className="text-sm font-medium capitalize">{p}</div>
              <div className="text-xs text-green-400 mt-0.5">✓ Configured</div>
            </div>
          </div>
        ))}
      </div>

      <div className="forge-panel overflow-hidden">
        <div className="px-4 py-2.5 border-b border-forge-border text-xs text-gray-500 uppercase tracking-wider">Role Matrix</div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-forge-border/50">
            <th className="text-left py-2 px-4 text-xs text-gray-500">Role</th>
            {config.database.models.map(m => <th key={m.name} className="text-left py-2 px-4 text-xs text-gray-500">{m.name}</th>)}
          </tr></thead>
          <tbody>
            {config.auth.roles.map(role => (
              <tr key={role} className="border-b border-forge-border/30">
                <td className="py-2 px-4"><span className="forge-badge forge-badge-blue">{role}</span></td>
                {config.database.models.map(m => (
                  <td key={m.name} className="py-2 px-4 text-xs text-green-400">
                    {role === "admin" ? "CRUD" : role.includes("viewer") || role.includes("readonly") ? "Read" : "CRU"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="forge-panel p-4 space-y-3">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Environment Variables</div>
        {Object.entries(result.envVars).filter(([k]) => k.includes("AUTH") || k.includes("GOOGLE") || k.includes("GITHUB")).map(([k, v]) => (
          <div key={k} className="flex items-center gap-3">
            <span className="font-code text-xs text-sky-300 w-40 shrink-0">{k}</span>
            <span className="font-code text-xs text-gray-500 truncate">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeployTab({ result }: { result: GenerationResult }) {
  return (
    <div className="max-w-3xl animate-slide-up space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {result.deployTargets.map(t => (
          <div key={t.name} className={`forge-panel p-4 ${t.recommended ? "border-forge-accent/50" : ""}`}>
            {t.recommended && (
              <div className="forge-badge forge-badge-green border border-green-500/20 text-[10px] mb-2">★ Recommended</div>
            )}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display font-bold">{t.name}</span>
              <span className="ml-auto text-xs text-green-400">{t.cost}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {t.features.map(f => <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-forge-bg3 text-gray-400">{f}</span>)}
            </div>
            <a href={t.url} target="_blank" rel="noopener noreferrer"
              className="block text-center forge-btn-ghost text-xs py-1.5">
              Deploy to {t.name} →
            </a>
          </div>
        ))}
      </div>

      <div className="forge-panel p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Required Environment Variables</div>
        <div className="space-y-1.5">
          {Object.entries(result.envVars).map(([k, v]) => (
            <div key={k} className="flex items-center gap-3 font-code text-xs">
              <span className="text-sky-300 w-44 shrink-0">{k}</span>
              <span className="text-gray-500">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
