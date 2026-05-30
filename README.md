# AppForge — AI App Generator

> **Track A — Full Stack Engineer Demo Task**
> Metadata-driven application runtime that converts JSON configuration into working full-stack applications.

---

## What It Does

Drop a JSON configuration schema → get a complete application with:

- ✅ **Frontend UI** — generated pages (dashboard, tables, forms, settings) from `pages[]`
- ✅ **API Routes** — full CRUD REST endpoints for every model in `database.models[]`
- ✅ **Database Schema** — Prisma models + raw SQL `CREATE TABLE` statements, namespaced per app
- ✅ **Authentication** — email/password + Google + GitHub OAuth via NextAuth.js
- ✅ **Workflow Automation** — event-driven triggers with condition evaluation + template interpolation
- ✅ **Graceful Error Handling** — null entries, unknown types, invalid values, missing fields — all sanitized

### Bonus Features (3 of 5 implemented + extras)

| Feature | Status | Notes |
|---|---|---|
| CSV Import | ✅ | Row-level validation, duplicate detection, bulk insert |
| Notifications | ✅ | In-app feed via workflow logs; webhook + email actions |
| Multi-language (i18n) | ✅ | English, Spanish, French — locale auto-detected from `Accept-Language` |
| PWA Support | ✅ | `manifest.json`, `viewport` meta, offline-ready structure |
| GitHub Export | ✅ | `/api/apps/[id]/export` returns full file tree + deploy commands |
| Multi-auth Login | ✅ | email + Google + GitHub — provider list driven by config |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | TailwindCSS |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js v5 |
| State | Zustand (persisted) |
| Validation | Zod + custom runtime validator |
| CSV | PapaParse |
| i18n | i18next + react-i18next |
| Deployment | Vercel + Neon (recommended) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AppForge Platform                     │
│                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  Builder │───▶│  /api/generate│───▶│  Validator    │  │
│  │  (UI)    │    │              │    │  + Sanitizer  │  │
│  └──────────┘    └──────────────┘    └───────┬───────┘  │
│                                              │           │
│                                    ┌─────────▼─────────┐ │
│                                    │   Generator        │ │
│                                    │  • Routes          │ │
│                                    │  • Prisma schema   │ │
│                                    │  • SQL DDL         │ │
│                                    │  • Env vars        │ │
│                                    └─────────┬─────────┘ │
│                                              │           │
│  ┌──────────────────────────────────────────▼─────────┐ │
│  │           Dynamic Runtime API                       │ │
│  │  /api/apps/[appId]/data/[model]                    │ │
│  │  • GET (list + filter + search + paginate)         │ │
│  │  • POST (create + validate + fire workflows)       │ │
│  │  • PUT (update + fire workflows)                   │ │
│  │  • DELETE                                          │ │
│  │  • POST /import (CSV bulk import)                  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  Platform DB (Prisma)      App Tables (raw SQL, namespaced)│
│  users, apps, sessions     app_{id}_contacts             │
│  workflow_logs, api_keys   app_{id}_deals                │
│  analytics_events          app_{id}_...                  │
└─────────────────────────────────────────────────────────┘
```

---

## Config Schema

```jsonc
{
  "app": {
    "name": "My App",        // required — defaults to "Unnamed App" if missing
    "icon": "🚀",            // optional — defaults to "🌐"
    "description": "...",
    "theme": "dark",         // "light" | "dark"
    "version": "1.0.0"
  },
  "auth": {
    "providers": ["email", "google", "github"],  // any subset
    "roles": ["admin", "user"]
  },
  "database": {
    "models": [
      {
        "name": "Contact",
        "fields": [
          { "name": "email",  "type": "email",  "required": true },
          { "name": "status", "type": "enum",   "values": ["lead", "customer"], "default": "lead" },
          { "name": "value",  "type": "number" }
        ]
      }
    ]
  },
  "pages": [
    { "name": "Dashboard", "type": "dashboard", "metrics": [...] },
    { "name": "Contacts",  "type": "table", "model": "Contact", "actions": ["create", "edit", "delete", "import_csv"] }
  ],
  "workflows": [
    {
      "name": "New Lead Alert",
      "trigger": "Contact.create",
      "condition": "status == lead",     // optional — simple field comparisons
      "action": "notify",
      "template": "New lead: {{name}}"   // {{field}} interpolation
    }
  ]
}
```

### Graceful Error Handling

The runtime handles all of these **without crashing**:

| Issue | Behavior |
|---|---|
| `app.name` is empty | Defaults to `"Unnamed App"` |
| `app.icon` is `null` | Defaults to `"🌐"` |
| Unknown keys in `app` | Ignored with a warning |
| `database.models[n]` is `null` | Skipped with an error logged |
| `model.fields` is not an array | Treated as `[]` |
| Unknown field type | Coerced to `"string"` |
| `number` field with string default | Default is removed |
| `enum` field without `values` | `values` defaults to `[]` |
| `pages[n]` is `null` | Skipped with a warning |
| Unknown `page.type` | Rendered as `"generic"` |
| Unknown auth provider | Skipped |
| Invalid workflow action | Defaults to `"notify"` |

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/your-org/appforge
cd appforge
npm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
# Fill in DATABASE_URL and NEXTAUTH_SECRET at minimum
```

### 3. Push schema

```bash
npx prisma db push
```

### 4. Run

```bash
npm run dev
# → http://localhost:3000
```

---

## Deployment

### Vercel + Neon (Recommended)

1. Create a Neon database at [neon.tech](https://neon.tech) — copy the connection string
2. Push to GitHub
3. Import project at [vercel.com/new](https://vercel.com/new)
4. Add environment variables from `.env.example`
5. Deploy

### Railway

1. `railway new` in the project directory
2. Add a PostgreSQL plugin
3. Set env vars in the Railway dashboard
4. `railway up`

---

## API Reference

### `POST /api/generate`

Parse, validate, and generate an app from a JSON config.

```bash
curl -X POST /api/generate \
  -H "Content-Type: application/json" \
  -d '{ "config": { "app": { "name": "My App" }, ... } }'
```

Response includes: `config`, `validation`, `routes`, `schemas`, `envVars`, `deployTargets`.

### `GET /api/apps/[appId]/data/[model]`

List records with pagination, sorting, filtering, and full-text search.

```
GET /api/apps/abc/data/contacts?page=1&limit=20&sort=name&dir=asc&search=alice&status=lead
```

### `POST /api/apps/[appId]/data/[model]/import`

Bulk CSV import with row-level validation.

```bash
curl -X POST /api/apps/abc/data/contacts/import \
  -H "Content-Type: text/csv" \
  --data-binary @contacts.csv
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    Landing page
│   ├── builder/page.tsx            JSON builder UI
│   ├── dashboard/page.tsx          App list
│   ├── (auth)/auth/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── api/
│       ├── generate/route.ts       Core generation endpoint
│       ├── apps/route.ts           App CRUD
│       ├── apps/[appId]/
│       │   ├── data/[model]/route.ts  Dynamic model CRUD
│       │   └── export/route.ts     GitHub export
│       ├── auth/[...nextauth]/     NextAuth handler
│       ├── notifications/route.ts
│       └── analytics/route.ts
├── lib/
│   ├── auth.ts                     NextAuth config
│   ├── db.ts                       Prisma singleton
│   ├── i18n.ts                     i18next (en, es, fr)
│   ├── store.ts                    Zustand state
│   ├── runtime/
│   │   ├── generator.ts            Config → artifacts
│   │   └── api-handler.ts          CRUD helpers + CSV + workflows
│   └── validators/
│       └── config-validator.ts     Validate + sanitize
├── types/
│   └── config.ts                   TypeScript types
└── middleware.ts                   Auth guard + i18n
```
