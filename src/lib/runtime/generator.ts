import type {
  SanitizedConfig, GeneratedRoute, GeneratedSchema,
  GenerationResult, DeployTarget, FieldDef, FieldType,
} from "@/types/config";
import { validateConfig, sanitizeConfig } from "@/lib/validators/config-validator";

// ─── Prisma type map ──────────────────────────────────────────────────────

const PRISMA_TYPES: Record<FieldType, string> = {
  string:   "String",
  text:     "String",
  richtext: "String",
  number:   "Float",
  boolean:  "Boolean",
  email:    "String",
  datetime: "DateTime",
  date:     "DateTime",
  time:     "String",
  enum:     "String",
  relation: "Int",
  array:    "String",
  image:    "String",
  file:     "String",
  json:     "Json",
};

const SQL_TYPES: Record<FieldType, string> = {
  string:   "TEXT",
  text:     "TEXT",
  richtext: "TEXT",
  number:   "DOUBLE PRECISION",
  boolean:  "BOOLEAN",
  email:    "TEXT",
  datetime: "TIMESTAMPTZ",
  date:     "DATE",
  time:     "TIME",
  enum:     "TEXT",
  relation: "INTEGER",
  array:    "TEXT[]",
  image:    "TEXT",
  file:     "TEXT",
  json:     "JSONB",
};

// ─── Main Generator ───────────────────────────────────────────────────────

export function generateApp(rawConfig: unknown): GenerationResult {
  const validation = validateConfig(rawConfig);
  const config = sanitizeConfig(rawConfig);

  const routes = generateRoutes(config);
  const schemas = generateSchemas(config);
  const envVars = generateEnvVars(config);
  const deployTargets = getDeployTargets();

  return { config, validation, routes, schemas, envVars, deployTargets };
}

// ─── Route Generator ──────────────────────────────────────────────────────

export function generateRoutes(config: SanitizedConfig): GeneratedRoute[] {
  const routes: GeneratedRoute[] = [];

  // CRUD routes for each model
  config.database.models.forEach((model) => {
    const base = `/api/${model.name.toLowerCase()}s`;

    routes.push(
      { method: "GET",    path: base,                  description: `List ${model.name} with pagination, filtering, sorting`, model: model.name },
      { method: "POST",   path: base,                  description: `Create new ${model.name}`, model: model.name },
      { method: "GET",    path: `${base}/:id`,         description: `Get ${model.name} by ID`, model: model.name },
      { method: "PUT",    path: `${base}/:id`,         description: `Update ${model.name}`, model: model.name },
      { method: "DELETE", path: `${base}/:id`,         description: `Delete ${model.name}`, model: model.name },
      { method: "GET",    path: `${base}/export`,      description: `Export ${model.name} as CSV`, model: model.name, feature: "csv" },
      { method: "POST",   path: `${base}/import`,      description: `Bulk import ${model.name} from CSV`, model: model.name, feature: "csv" },
    );
  });

  // Auth routes
  config.auth.providers.forEach((provider) => {
    routes.push(
      { method: "POST", path: `/api/auth/${provider}`,          description: `${provider} auth initiation` },
      { method: "GET",  path: `/api/auth/${provider}/callback`, description: `${provider} OAuth callback` },
    );
  });

  // Core platform routes
  routes.push(
    { method: "GET",  path: "/api/auth/session",    description: "Get current session" },
    { method: "POST", path: "/api/auth/logout",     description: "Destroy session" },
    { method: "GET",  path: "/api/schema",          description: "Get app schema metadata" },
    { method: "POST", path: "/api/workflows/run",   description: "Manually trigger workflow" },
    { method: "GET",  path: "/api/workflows/logs",  description: "List workflow execution logs" },
    { method: "GET",  path: "/api/analytics",       description: "App analytics summary" },
    { method: "GET",  path: "/api/notifications",   description: "List notifications", feature: "notify" },
    { method: "POST", path: "/api/notifications/mark-read", description: "Mark notifications read", feature: "notify" },
  );

  return routes;
}

// ─── Schema Generator ─────────────────────────────────────────────────────

export function generateSchemas(config: SanitizedConfig): GeneratedSchema[] {
  return config.database.models.map((model) => ({
    tableName:   model.name.toLowerCase() + "s",
    model,
    sql:         generateSQL(model),
    prismaModel: generatePrismaModel(model),
  }));
}

function generateSQL(model: SanitizedConfig["database"]["models"][0]): string {
  const table = model.name.toLowerCase() + "s";
  const lines = [
    `  id SERIAL PRIMARY KEY`,
  ];

  model.fields.forEach((f) => {
    const sqlType = SQL_TYPES[f.type] || "TEXT";
    const notNull = f.required ? " NOT NULL" : "";
    const unique = f.unique ? " UNIQUE" : "";
    const def = f.default !== undefined
      ? ` DEFAULT ${typeof f.default === "string" ? `'${f.default}'` : f.default}`
      : "";
    lines.push(`  ${f.name} ${sqlType}${notNull}${unique}${def}`);
  });

  if (model.timestamps !== false) {
    lines.push(`  created_at TIMESTAMPTZ DEFAULT NOW()`);
    lines.push(`  updated_at TIMESTAMPTZ DEFAULT NOW()`);
  }

  if (model.softDelete) {
    lines.push(`  deleted_at TIMESTAMPTZ`);
  }

  return `CREATE TABLE IF NOT EXISTS ${table} (\n${lines.join(",\n")}\n);`;
}

function generatePrismaModel(model: SanitizedConfig["database"]["models"][0]): string {
  const lines = [`model ${model.name} {`];
  lines.push(`  id        Int      @id @default(autoincrement())`);

  model.fields.forEach((f) => {
    const prismaType = PRISMA_TYPES[f.type] || "String";
    const optional = !f.required ? "?" : "";
    const unique = f.unique ? " @unique" : "";
    const def = f.default !== undefined
      ? ` @default(${typeof f.default === "string" ? `"${f.default}"` : f.default})`
      : "";
    lines.push(`  ${f.name.padEnd(14)}${prismaType}${optional}${unique}${def}`);
  });

  if (model.timestamps !== false) {
    lines.push(`  createdAt DateTime @default(now())`);
    lines.push(`  updatedAt DateTime @updatedAt`);
  }

  lines.push(`}`);
  return lines.join("\n");
}

// ─── Env Vars ─────────────────────────────────────────────────────────────

export function generateEnvVars(config: SanitizedConfig): Record<string, string> {
  const vars: Record<string, string> = {
    DATABASE_URL:    "postgresql://USER:PASSWORD@HOST:5432/DB_NAME",
    NEXTAUTH_URL:    "https://your-app.vercel.app",
    NEXTAUTH_SECRET: crypto.randomUUID().replace(/-/g, ""),
  };

  if (config.auth.providers.includes("google")) {
    vars.GOOGLE_CLIENT_ID = "your-google-client-id";
    vars.GOOGLE_CLIENT_SECRET = "your-google-client-secret";
  }
  if (config.auth.providers.includes("github")) {
    vars.GITHUB_ID = "your-github-app-id";
    vars.GITHUB_SECRET = "your-github-app-secret";
  }
  if (config.auth.providers.includes("facebook")) {
    vars.FACEBOOK_CLIENT_ID = "your-facebook-app-id";
    vars.FACEBOOK_CLIENT_SECRET = "your-facebook-app-secret";
  }
  if (config.notifications?.email) {
    vars.SMTP_HOST = "smtp.your-provider.com";
    vars.SMTP_PORT = "587";
    vars.SMTP_USER = "your-smtp-user";
    vars.SMTP_PASS = "your-smtp-password";
  }

  return vars;
}

// ─── Deploy targets ───────────────────────────────────────────────────────

export function getDeployTargets(): DeployTarget[] {
  return [
    {
      name:        "Vercel",
      platform:    "vercel",
      url:         "https://vercel.com/new",
      cost:        "Free tier",
      recommended: true,
      features:    ["Next.js native", "Edge runtime", "Preview deploys", "Auto-scaling"],
    },
    {
      name:        "Railway",
      platform:    "railway",
      url:         "https://railway.app",
      cost:        "$5/month",
      recommended: false,
      features:    ["PostgreSQL included", "Auto-deploy", "Private networking", "Metrics"],
    },
    {
      name:        "Render",
      platform:    "render",
      url:         "https://render.com",
      cost:        "Free tier",
      recommended: false,
      features:    ["Managed DB", "Auto TLS", "DDoS protection", "Preview envs"],
    },
    {
      name:        "Neon",
      platform:    "neon",
      url:         "https://neon.tech",
      cost:        "Free tier",
      recommended: false,
      features:    ["Serverless Postgres", "DB branching", "0ms cold start", "Autoscaling"],
    },
  ];
}

// ─── GitHub export generator ──────────────────────────────────────────────

export function generateGitHubExport(config: SanitizedConfig): Record<string, string> {
  const envVars = generateEnvVars(config);
  const schemas = generateSchemas(config);

  return {
    "README.md": generateReadme(config),
    ".env.example": Object.entries(envVars).map(([k, v]) => `${k}=${v}`).join("\n"),
    "prisma/schema.prisma": generatePrismaSchema(config, schemas),
    "DEPLOY.md": generateDeployGuide(config),
  };
}

function generateReadme(config: SanitizedConfig): string {
  return `# ${config.app.name}

${config.app.description}

Generated by [AppForge](https://appforge.dev) — metadata-driven app runtime.

## Tech Stack

- **Framework**: Next.js 15 + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (${config.auth.providers.join(", ")})
- **Styling**: TailwindCSS
- **Deployment**: Vercel + Neon

## Models

${config.database.models.map((m) => `### ${m.name}\n${m.fields.map((f) => `- \`${f.name}\`: ${f.type}${f.required ? " (required)" : ""}`).join("\n")}`).join("\n\n")}

## Getting Started

\`\`\`bash
npm install
cp .env.example .env.local
npx prisma db push
npm run dev
\`\`\`
`;
}

function generatePrismaSchema(config: SanitizedConfig, schemas: GeneratedSchema[]): string {
  return `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

${schemas.map((s) => s.prismaModel).join("\n\n")}
`;
}

function generateDeployGuide(config: SanitizedConfig): string {
  return `# Deploying ${config.app.name}

## Option 1: Vercel + Neon (Recommended)

1. Push this repo to GitHub
2. Import to Vercel: https://vercel.com/new
3. Create a Neon database: https://neon.tech
4. Add environment variables from \`.env.example\`
5. Deploy!

## Option 2: Railway

1. Create a new Railway project
2. Add a PostgreSQL service
3. Connect your GitHub repo
4. Set environment variables
5. Deploy

## Environment Variables

See \`.env.example\` for all required variables.
`;
}
