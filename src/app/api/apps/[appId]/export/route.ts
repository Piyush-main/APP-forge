import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sanitizeConfig } from "@/lib/validators/config-validator";
import { generateGitHubExport, generateSchemas } from "@/lib/runtime/generator";
import { ok, err, unauthorized, notFound } from "@/lib/runtime/api-handler";

// GET /api/apps/[appId]/export — generate GitHub-ready file tree
export async function GET(
  _req: NextRequest,
  { params }: { params: { appId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const app = await prisma.app.findFirst({
    where: { id: params.appId, userId: session.user.id },
  });
  if (!app) return notFound("App");

  const config = sanitizeConfig(app.config);
  const files  = generateGitHubExport(config);

  // Also generate the full Next.js project structure listing
  const projectStructure = buildProjectStructure(config);

  return ok({
    appName:   config.app.name,
    files,
    structure: projectStructure,
    commands: [
      "npm install",
      "cp .env.example .env.local",
      "# Fill in your .env.local values",
      "npx prisma db push",
      "npm run dev",
    ],
    deployUrl: `https://vercel.com/new/git/external?repository-url=https://github.com/your-org/${app.slug}`,
  });
}

function buildProjectStructure(config: ReturnType<typeof sanitizeConfig>) {
  return {
    "src/": {
      "app/": {
        "layout.tsx":    "Root layout with fonts, providers, PWA meta",
        "page.tsx":      "Landing page",
        "globals.css":   "Tailwind + CSS variables",
        "dashboard/":    { "page.tsx": "App list dashboard" },
        "builder/":      { "page.tsx": "JSON config builder" },
        "(auth)/":       { "login/page.tsx": "Login", "register/page.tsx": "Register" },
        "api/": {
          "generate/route.ts":          "POST — parse & validate config",
          "apps/route.ts":              "GET list / POST create app",
          "apps/[appId]/":              {
            "data/[model]/route.ts":    "Dynamic CRUD for any model",
            "export/route.ts":          "GitHub export",
            "provision/route.ts":       "Create DB tables",
          },
          "auth/":                      { "[...nextauth]/route.ts": "NextAuth handler", "register/route.ts": "Email signup" },
          "notifications/route.ts":     "In-app notification feed",
          "analytics/route.ts":         "Usage analytics",
        },
      },
      "lib/": {
        "auth.ts":                  "NextAuth config (email + OAuth)",
        "db.ts":                    "Prisma singleton",
        "i18n.ts":                  "i18next setup (en, es, fr)",
        "runtime/": {
          "generator.ts":           "Config → routes/schema/env-vars",
          "api-handler.ts":         "CRUD helpers, CSV, workflow runner",
        },
        "validators/": {
          "config-validator.ts":    "Validate + sanitize AppConfig JSON",
        },
      },
      "types/": {
        "config.ts":   "Full TypeScript types for AppConfig",
      },
    },
    "prisma/": {
      "schema.prisma":  "Platform schema (users, apps, workflows, analytics)",
    },
    "public/": {
      "manifest.json":  "PWA manifest",
    },
    ...Object.fromEntries(
      config.database.models.map((m) => [
        `[generated] ${m.name} table`,
        `app_{id}_${m.name.toLowerCase()}s — provisioned at runtime`,
      ]),
    ),
  };
}
