import Link from "next/link";

export default function HomePage() {
  const features = [
    { icon: "⚡", title: "JSON → Full-Stack App", desc: "Drop a configuration schema and get a complete app with frontend, API, and database schema." },
    { icon: "🛡️", title: "Graceful Error Handling", desc: "Missing fields, invalid types, unknown components — all handled automatically with clear warnings." },
    { icon: "🔐", title: "Multi-Auth Built In", desc: "Email/password, Google, and GitHub OAuth — configured from a single auth block in your JSON." },
    { icon: "📥", title: "CSV Import", desc: "Any table supports bulk CSV import with row-level validation, deduplication, and error reporting." },
    { icon: "🔔", title: "Workflow Automation", desc: "Event-driven workflows fire on create/update with condition evaluation and template interpolation." },
    { icon: "🌐", title: "i18n Ready", desc: "Multi-language support baked in. Add locales to your config and every page renders in the right language." },
  ];

  const stack = [
    { name: "Next.js 15", role: "Framework" },
    { name: "TypeScript", role: "Language" },
    { name: "TailwindCSS", role: "Styling" },
    { name: "PostgreSQL", role: "Database" },
    { name: "Prisma", role: "ORM" },
    { name: "NextAuth.js", role: "Auth" },
  ];

  return (
    <div className="min-h-screen bg-forge-bg">
      {/* Nav */}
      <nav className="border-b border-forge-border bg-forge-bg2/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-display font-extrabold text-xl text-gradient tracking-tight">
            AppForge
          </span>
          <div className="flex items-center gap-3">
            <Link href="/builder" className="forge-btn-ghost text-sm">Builder</Link>
            <Link href="/auth/login" className="forge-btn-ghost text-sm">Sign in</Link>
            <Link href="/auth/register" className="forge-btn-primary text-sm">Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 forge-badge forge-badge-purple mb-6 px-3 py-1 rounded-full border border-purple-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse-slow" />
          <span className="text-xs font-medium text-purple-300">Metadata-driven runtime</span>
        </div>

        <h1 className="font-display font-extrabold text-5xl md:text-7xl tracking-tight mb-6 leading-none">
          <span className="text-white">Drop JSON.</span>
          <br />
          <span className="text-gradient">Get an App.</span>
        </h1>

        <p className="text-gray-400 text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          AppForge converts JSON configuration into complete full-stack applications —
          frontend, API routes, database schema, auth, and workflows — all in real time.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/builder" className="forge-btn-primary text-base px-6 py-3 rounded-xl">
            ⚡ Open Builder
          </Link>
          <a href="https://github.com" className="forge-btn-ghost text-base px-6 py-3 rounded-xl">
            View on GitHub →
          </a>
        </div>

        {/* Code preview */}
        <div className="mt-16 max-w-3xl mx-auto bg-forge-bg2 border border-forge-border rounded-2xl p-6 text-left animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-red-500/60" />
            <span className="w-3 h-3 rounded-full bg-amber-500/60" />
            <span className="w-3 h-3 rounded-full bg-green-500/60" />
            <span className="ml-2 text-xs text-gray-500 font-code">config.json</span>
          </div>
          <pre className="font-code text-sm leading-relaxed overflow-x-auto">
<code className="text-gray-300">{`{
  `}<span className="text-forge-accent2">"app"</span>{`: { `}<span className="text-forge-accent2">"name"</span>{`: `}<span className="text-green-400">"My CRM"</span>{`, `}<span className="text-forge-accent2">"icon"</span>{`: `}<span className="text-green-400">"🚀"</span>{` },
  `}<span className="text-forge-accent2">"auth"</span>{`: { `}<span className="text-forge-accent2">"providers"</span>{`: [`}<span className="text-green-400">"email"</span>{`, `}<span className="text-green-400">"google"</span>{`] },
  `}<span className="text-forge-accent2">"database"</span>{`: {
    `}<span className="text-forge-accent2">"models"</span>{`: [{
      `}<span className="text-forge-accent2">"name"</span>{`: `}<span className="text-green-400">"Contact"</span>{`,
      `}<span className="text-forge-accent2">"fields"</span>{`: [
        { `}<span className="text-forge-accent2">"name"</span>{`: `}<span className="text-green-400">"email"</span>{`, `}<span className="text-forge-accent2">"type"</span>{`: `}<span className="text-green-400">"email"</span>{`, `}<span className="text-forge-accent2">"required"</span>{`: `}<span className="text-amber-400">true</span>{` },
        { `}<span className="text-forge-accent2">"name"</span>{`: `}<span className="text-green-400">"status"</span>{`, `}<span className="text-forge-accent2">"type"</span>{`: `}<span className="text-green-400">"enum"</span>{`, `}<span className="text-forge-accent2">"values"</span>{`: [`}<span className="text-green-400">"lead"</span>{`, `}<span className="text-green-400">"customer"</span>{`] }
      ]
    }]
  }
}`}</code>
          </pre>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-display font-bold text-3xl text-center mb-12">
          Everything generated. Nothing configured manually.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="forge-panel p-6 hover:border-forge-border2 transition-colors">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stack */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="forge-panel p-8 text-center">
          <h2 className="font-display font-bold text-2xl mb-8">Mandatory Tech Stack</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {stack.map((s) => (
              <div key={s.name} className="bg-forge-bg3 border border-forge-border rounded-lg px-5 py-3">
                <div className="font-semibold text-sm text-gray-100">{s.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.role}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center gap-4">
            <span className="forge-badge forge-badge-green border border-green-500/20 px-3 py-1">Vercel</span>
            <span className="forge-badge forge-badge-blue border border-blue-500/20 px-3 py-1">Railway</span>
            <span className="forge-badge forge-badge-amber border border-amber-500/20 px-3 py-1">Render</span>
            <span className="forge-badge forge-badge-purple border border-purple-500/20 px-3 py-1">Neon</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-forge-border py-8 text-center text-gray-600 text-sm">
        AppForge — Demo Task · Full Stack Engineer Track A
      </footer>
    </div>
  );
}
