import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sanitizeConfig } from "@/lib/validators/config-validator";
import { generateGitHubExport, generateSchemas } from "@/lib/runtime/generator";
import { ok, err, unauthorized, notFound } from "@/lib/runtime/api-handler";

type RouteParams = { params: Promise<{ appId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { appId } = await params;

  const app = await prisma.app.findFirst({
    where: { id: appId, userId: session.user.id },
  });
  if (!app) return notFound("App");

  const config = sanitizeConfig(app.config);
  const files  = generateGitHubExport(config);
  const projectStructure = buildProjectStructure(config);

  return ok({
    appName: config.app.name,
    files,
    structure: projectStructure,
    commands: [
      "npm install",
      "cp .env.example .env.local",
      "npx prisma db push",
      "npm run dev",
    ],
    deployUrl: `https://vercel.com/new/git/external?repository-url=https://github.com/your-org/${app.slug}`,
  });
}

function buildProjectStructure(config: ReturnType<typeof sanitizeConfig>) {
  return {
    "src/app/": "Next.js App Router pages and API routes",
    "src/lib/": "Auth, DB, runtime engine, validators, i18n",
    "src/types/": "TypeScript types for AppConfig",
    "prisma/schema.prisma": "Platform schema",
    "public/manifest.json": "PWA manifest",
    models: config.database.models.map((m) => ({
      name: m.name,
      table: `app_{id}_${m.name.toLowerCase()}s`,
    })),
  };
}