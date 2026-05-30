import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ok, err, unauthorized, paginated } from "@/lib/runtime/api-handler";
import { generateApp } from "@/lib/runtime/generator";
import { sanitizeConfig } from "@/lib/validators/config-validator";

// GET /api/apps — list user's apps
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const url = new URL(req.url);
  const page  = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "12", 10);

  const [apps, total] = await prisma.$transaction([
    prisma.app.findMany({
      where:   { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id: true, name: true, slug: true, description: true,
        icon: true, status: true, createdAt: true, updatedAt: true,
        _count: { select: { deploys: true } },
      },
    }),
    prisma.app.count({ where: { userId: session.user.id } }),
  ]);

  return paginated(apps, total, page, limit);
}

// POST /api/apps — create and persist a new app
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body?.config) return err("config is required", 400);

  const result = generateApp(body.config);
  if (result.validation.errors.length > 0 && !result.validation.valid) {
    return err("Invalid configuration", 422, result.validation.errors);
  }

  const cfg = result.config;
  const baseSlug = cfg.app.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 40);
  const slug     = `${baseSlug}-${Math.random().toString(36).substr(2, 6)}`;
  const dbPrefix = `app_${Math.random().toString(36).substr(2, 10)}_`;

  try {
    const app = await prisma.app.create({
      data: {
        userId:      session.user.id,
        name:        cfg.app.name,
        slug,
        description: cfg.app.description,
        icon:        cfg.app.icon,
        config:      body.config,
        status:      "active",
        dbPrefix,
      },
    });

    // Provision dynamic tables (best-effort)
    provisionTables(app.id, dbPrefix, cfg).catch(console.error);

    return ok({ app, generation: result }, { created: true });
  } catch (e) {
    console.error("[apps POST]", e);
    return err("Failed to create app", 500);
  }
}

// ─── Provision dynamic tables ─────────────────────────────────────────────
async function provisionTables(
  appId: string,
  dbPrefix: string,
  config: ReturnType<typeof sanitizeConfig>,
) {
  for (const model of config.database.models) {
    const table = `${dbPrefix}${model.name.toLowerCase()}s`;
    const cols = [
      `id SERIAL PRIMARY KEY`,
      ...model.fields.map((f) => {
        const typeMap: Record<string, string> = {
          string: "TEXT", text: "TEXT", richtext: "TEXT", number: "DOUBLE PRECISION",
          boolean: "BOOLEAN", email: "TEXT", datetime: "TIMESTAMPTZ", date: "DATE",
          time: "TIME", enum: "TEXT", relation: "INTEGER", array: "TEXT[]",
          image: "TEXT", file: "TEXT", json: "JSONB",
        };
        const sqlType = typeMap[f.type] || "TEXT";
        const notNull = f.required ? " NOT NULL" : "";
        const def = f.default !== undefined
          ? ` DEFAULT ${typeof f.default === "string" ? `'${f.default}'` : f.default}`
          : "";
        return `"${f.name}" ${sqlType}${notNull}${def}`;
      }),
      `created_at TIMESTAMPTZ DEFAULT NOW()`,
      `updated_at TIMESTAMPTZ DEFAULT NOW()`,
    ];

    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "${table}" (${cols.join(", ")})`,
    );
  }

  await prisma.app.update({
    where: { id: appId },
    data:  { status: "active" },
  });
}
