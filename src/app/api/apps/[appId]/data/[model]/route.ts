import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  parseQueryOptions, buildWhereClause, validateRecord,
  processCSVRows, evaluateWorkflowCondition, interpolateTemplate,
  ok, paginated, err, notFound, unauthorized,
} from "@/lib/runtime/api-handler";
import { sanitizeConfig } from "@/lib/validators/config-validator";
import type { SanitizedConfig } from "@/types/config";
import { auth } from "@/lib/auth";

// ─── Helpers ──────────────────────────────────────────────────────────────

async function getAppAndModel(appId: string, modelName: string) {
  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) return { app: null, model: null, config: null };

  const config = sanitizeConfig(app.config);
  const model = config.database.models.find(
    (m) => m.name.toLowerCase() === modelName.toLowerCase(),
  );
  return { app, model: model ?? null, config };
}

// ─── GET /api/apps/[appId]/data/[model] ──────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { appId: string; model: string } },
) {
  const session = await auth();
  if (!session) return unauthorized();

  const { app, model } = await getAppAndModel(params.appId, params.model);
  if (!app || !model) return notFound("Model");

  const opts = parseQueryOptions(req);
  const tableName = `${app.dbPrefix}${model.name.toLowerCase()}s`;

  // Build query (using raw SQL against the namespaced table)
  const { where, params: qParams } = buildWhereClause(model, opts);
  const offset = ((opts.page ?? 1) - 1) * (opts.limit ?? 20);

  try {
    // Count
    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "${tableName}" ${where}`,
      ...qParams,
    );
    const total = Number(countResult[0]?.count ?? 0);

    // Data
    const sortField = model.fields.find((f) => f.name === opts.sort) ? opts.sort : "id";
    const records = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "${tableName}" ${where} ORDER BY "${sortField}" ${opts.dir?.toUpperCase() ?? "DESC"} LIMIT ${opts.limit ?? 20} OFFSET ${offset}`,
      ...qParams,
    );

    // Track analytics
    prisma.analyticsEvent.create({
      data: { appId: app.id, event: "api_call", path: req.url },
    }).catch(() => {});

    return paginated(records, total, opts.page ?? 1, opts.limit ?? 20);
  } catch (e) {
    // Table may not exist yet — return empty gracefully
    console.warn("[data GET]", e);
    return paginated([], 0, 1, 20);
  }
}

// ─── POST /api/apps/[appId]/data/[model] ─────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { appId: string; model: string } },
) {
  const session = await auth();
  if (!session) return unauthorized();

  const { app, model, config } = await getAppAndModel(params.appId, params.model);
  if (!app || !model || !config) return notFound("Model");

  const contentType = req.headers.get("content-type") ?? "";

  // ── CSV import ──
  if (contentType.includes("text/csv") || contentType.includes("multipart/form-data")) {
    const text = await req.text();
    const Papa = await import("papaparse");
    const { data: rows } = Papa.default.parse<Record<string, unknown>>(text, {
      header: true, skipEmptyLines: true, dynamicTyping: true,
    });

    const result = processCSVRows(model, rows);
    const tableName = `${app.dbPrefix}${model.name.toLowerCase()}s`;

    // Bulk insert valid rows
    for (const record of result.records) {
      const keys = Object.keys(record);
      const vals = Object.values(record);
      if (keys.length > 0) {
        const cols = keys.map((k) => `"${k}"`).join(", ");
        const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
        await prisma.$executeRawUnsafe(
          `INSERT INTO "${tableName}" (${cols}) VALUES (${placeholders})`,
          ...vals,
        ).catch(() => {});
      }
    }

    prisma.analyticsEvent.create({
      data: { appId: app.id, event: "csv_import", metadata: { model: model.name, ...result } },
    }).catch(() => {});

    return ok(result);
  }

  // ── JSON create ──
  const body = await req.json().catch(() => ({}));
  const { valid, errors, sanitized } = validateRecord(model, body, true);
  if (!valid) return err("Validation failed", 422, errors);

  const tableName = `${app.dbPrefix}${model.name.toLowerCase()}s`;
  const keys = Object.keys(sanitized);
  const vals = Object.values(sanitized);

  let created: Record<string, unknown> = {};
  try {
    const cols = keys.map((k) => `"${k}"`).join(", ");
    const phs  = vals.map((_, i) => `$${i + 1}`).join(", ");
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `INSERT INTO "${tableName}" (${cols}) VALUES (${phs}) RETURNING *`,
      ...vals,
    );
    created = rows[0] ?? {};
  } catch (e) {
    console.error("[data POST]", e);
    return err("Failed to create record", 500);
  }

  // ── Fire workflows ──
  const trigger = `${model.name}.create`;
  fireWorkflows(config, trigger, created, app.id);

  return ok(created);
}

// ─── PUT /api/apps/[appId]/data/[model]/[id] ─────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: { appId: string; model: string; id?: string } },
) {
  const session = await auth();
  if (!session) return unauthorized();

  const { app, model, config } = await getAppAndModel(params.appId, params.model);
  if (!app || !model || !config) return notFound("Model");

  const id = new URL(req.url).pathname.split("/").pop();
  if (!id) return err("Missing record ID", 400);

  const body = await req.json().catch(() => ({}));
  const { valid, errors, sanitized } = validateRecord(model, body, false);
  if (!valid) return err("Validation failed", 422, errors);

  const tableName = `${app.dbPrefix}${model.name.toLowerCase()}s`;
  const keys = Object.keys(sanitized);
  const vals = Object.values(sanitized);

  let updated: Record<string, unknown> = {};
  try {
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE "${tableName}" SET ${setClauses}, updated_at = NOW() WHERE id = $${vals.length + 1} RETURNING *`,
      ...vals,
      parseInt(id, 10),
    );
    if (!rows[0]) return notFound(model.name);
    updated = rows[0];
  } catch (e) {
    return err("Failed to update record", 500);
  }

  fireWorkflows(config, `${model.name}.update`, updated, app.id);
  return ok(updated);
}

// ─── DELETE /api/apps/[appId]/data/[model]/[id] ──────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { appId: string; model: string } },
) {
  const session = await auth();
  if (!session) return unauthorized();

  const { app, model } = await getAppAndModel(params.appId, params.model);
  if (!app || !model) return notFound("Model");

  const id = new URL(req.url).pathname.split("/").pop();
  if (!id) return err("Missing record ID", 400);

  const tableName = `${app.dbPrefix}${model.name.toLowerCase()}s`;

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "${tableName}" WHERE id = $1`,
      parseInt(id, 10),
    );
  } catch {
    return err("Failed to delete record", 500);
  }

  return ok({ deleted: true, id });
}

// ─── Workflow executor (async, non-blocking) ──────────────────────────────

function fireWorkflows(
  config: SanitizedConfig,
  trigger: string,
  record: Record<string, unknown>,
  appId: string,
) {
  const matching = config.workflows.filter(
    (w) => w.trigger === trigger && w.enabled !== false,
  );

  matching.forEach(async (wf) => {
    const shouldRun = evaluateWorkflowCondition(wf.condition, record);
    const message = wf.template ? interpolateTemplate(wf.template, record) : wf.name;

    prisma.workflowLog.create({
      data: {
        appId,
        workflow: wf.name,
        trigger,
        payload:  record as object,
        result:   shouldRun ? "success" : "skipped",
        message:  shouldRun ? message : `Condition not met: ${wf.condition}`,
      },
    }).catch(console.error);

    if (!shouldRun) return;

    // Execute the workflow action
    if (wf.action === "notify") {
      // In-app notification (stored in DB, polled by frontend)
      // Production: integrate with push notification service
      console.log(`[workflow:notify] ${message}`);
    }

    if (wf.action === "webhook" && wf.webhook) {
      fetch(wf.webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger, record, message }),
      }).catch(console.error);
    }

    if (wf.action === "email" && wf.email) {
      // sendEmail(wf.email.to, wf.email.subject, interpolateTemplate(wf.email.body, record));
      console.log(`[workflow:email] to ${wf.email.to}: ${message}`);
    }
  });
}
