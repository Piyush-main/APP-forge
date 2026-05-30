import { NextRequest, NextResponse } from "next/server";
import type { SanitizedConfig, ModelDef } from "@/types/config";

// ─── Dynamic model router ─────────────────────────────────────────────────
// This powers /api/apps/[appId]/data/[model] routes.
// It reads the app's config, finds the model, and executes
// SQL against the app's namespaced tables in the shared DB.

export interface QueryOptions {
  page?:    number;
  limit?:   number;
  sort?:    string;
  dir?:     "asc" | "desc";
  search?:  string;
  filters?: Record<string, string>;
}

export function parseQueryOptions(req: NextRequest): QueryOptions {
  const url = new URL(req.url);
  const params = url.searchParams;
  return {
    page:   parseInt(params.get("page") || "1", 10),
    limit:  Math.min(parseInt(params.get("limit") || "20", 10), 100),
    sort:   params.get("sort") || "id",
    dir:    (params.get("dir") || "desc") as "asc" | "desc",
    search: params.get("search") || undefined,
    filters: Object.fromEntries(
      [...params.entries()].filter(([k]) => !["page","limit","sort","dir","search"].includes(k))
    ),
  };
}

// ─── Build safe WHERE clause ──────────────────────────────────────────────
// Parameterized to prevent SQL injection

export function buildWhereClause(
  model: ModelDef,
  opts: QueryOptions,
): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let pIdx = 1;

  // Search across searchable string fields
  if (opts.search) {
    const searchFields = model.fields.filter(
      (f) => ["string", "text", "email"].includes(f.type) && f.searchable !== false,
    );
    if (searchFields.length > 0) {
      const searchConds = searchFields.map((f) => {
        params.push(`%${opts.search}%`);
        return `${f.name} ILIKE $${pIdx++}`;
      });
      conditions.push(`(${searchConds.join(" OR ")})`);
    }
  }

  // Filters from query params
  if (opts.filters) {
    Object.entries(opts.filters).forEach(([key, value]) => {
      const field = model.fields.find((f) => f.name === key);
      if (!field) return; // ignore unknown filter fields for safety
      params.push(value);
      conditions.push(`${key} = $${pIdx++}`);
    });
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

// ─── Validate record against model ───────────────────────────────────────

export interface RecordValidationResult {
  valid: boolean;
  errors: string[];
  sanitized: Record<string, unknown>;
}

export function validateRecord(
  model: ModelDef,
  data: Record<string, unknown>,
  isCreate = true,
): RecordValidationResult {
  const errors: string[] = [];
  const sanitized: Record<string, unknown> = {};

  model.fields.forEach((field) => {
    const value = data[field.name];

    // Required check (only on create, or if value is explicitly set)
    if (isCreate && field.required && (value === undefined || value === null || value === "")) {
      errors.push(`${field.name} is required`);
      return;
    }

    if (value === undefined || value === null) {
      if (field.default !== undefined) sanitized[field.name] = field.default;
      return;
    }

    // Type coercion and validation
    switch (field.type) {
      case "number": {
        const n = Number(value);
        if (isNaN(n)) { errors.push(`${field.name} must be a number`); return; }
        sanitized[field.name] = n;
        break;
      }
      case "boolean":
        sanitized[field.name] = value === true || value === "true" || value === 1;
        break;
      case "email": {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(String(value))) { errors.push(`${field.name} must be a valid email`); return; }
        sanitized[field.name] = String(value).toLowerCase().trim();
        break;
      }
      case "datetime":
      case "date": {
        const d = new Date(String(value));
        if (isNaN(d.getTime())) { errors.push(`${field.name} must be a valid date`); return; }
        sanitized[field.name] = d.toISOString();
        break;
      }
      case "enum": {
        if (field.values && !field.values.includes(String(value))) {
          errors.push(`${field.name} must be one of: ${field.values.join(", ")}`);
          return;
        }
        sanitized[field.name] = String(value);
        break;
      }
      case "json":
        sanitized[field.name] = typeof value === "string" ? JSON.parse(value) : value;
        break;
      default:
        sanitized[field.name] = String(value);
    }
  });

  return { valid: errors.length === 0, errors, sanitized };
}

// ─── CSV processing ───────────────────────────────────────────────────────

export interface CSVImportResult {
  total:    number;
  imported: number;
  skipped:  number;
  errors:   { row: number; message: string }[];
  records:  Record<string, unknown>[];
}

export function processCSVRows(
  model: ModelDef,
  rows: Record<string, unknown>[],
): CSVImportResult {
  const result: CSVImportResult = {
    total: rows.length, imported: 0, skipped: 0, errors: [], records: [],
  };

  rows.forEach((row, i) => {
    const { valid, errors, sanitized } = validateRecord(model, row, true);
    if (valid) {
      result.imported++;
      result.records.push(sanitized);
    } else {
      result.skipped++;
      result.errors.push({ row: i + 1, message: errors.join("; ") });
    }
  });

  return result;
}

// ─── Workflow trigger evaluator ───────────────────────────────────────────

export function evaluateWorkflowCondition(
  condition: string | undefined,
  record: Record<string, unknown>,
): boolean {
  if (!condition) return true;

  try {
    // Safe subset: "field == value", "field != value", "field > value", "field < value"
    const eqMatch = condition.match(/^(\w+)\s*==\s*(.+)$/);
    if (eqMatch) return String(record[eqMatch[1]]) === eqMatch[2].trim();

    const neqMatch = condition.match(/^(\w+)\s*!=\s*(.+)$/);
    if (neqMatch) return String(record[neqMatch[1]]) !== neqMatch[2].trim();

    const gtMatch = condition.match(/^(\w+)\s*>\s*(.+)$/);
    if (gtMatch) return Number(record[gtMatch[1]]) > Number(gtMatch[2]);

    const ltMatch = condition.match(/^(\w+)\s*<\s*(.+)$/);
    if (ltMatch) return Number(record[ltMatch[1]]) < Number(ltMatch[2]);

    return false;
  } catch {
    return false;
  }
}

export function interpolateTemplate(
  template: string,
  record: Record<string, unknown>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(record[key] ?? ""));
}

// ─── Standard API response helpers ───────────────────────────────────────

export const ok = <T>(data: T, meta?: Record<string, unknown>) =>
  NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) });

export const paginated = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) =>
  NextResponse.json({
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });

export const err = (message: string, status = 400, details?: unknown) =>
  NextResponse.json({ success: false, error: message, ...(details ? { details } : {}) }, { status });

export const notFound = (resource = "Resource") =>
  NextResponse.json({ success: false, error: `${resource} not found` }, { status: 404 });

export const unauthorized = () =>
  NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

export const forbidden = () =>
  NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
