import type {
  AppConfig, SanitizedConfig, ValidationResult, ValidationIssue,
  FieldType, PageType, AuthProvider, WorkflowAction,
} from "@/types/config";

// ─── Constants ────────────────────────────────────────────────────────────

const VALID_FIELD_TYPES: FieldType[] = [
  "string", "text", "richtext", "number", "boolean", "email",
  "datetime", "date", "time", "enum", "relation", "array",
  "image", "file", "json",
];

const VALID_PAGE_TYPES: PageType[] = [
  "dashboard", "table", "form", "settings",
  "calendar", "kanban", "chart", "detail", "generic",
];

const VALID_AUTH_PROVIDERS: AuthProvider[] = [
  "email", "google", "github", "facebook", "twitter", "azure",
];

const VALID_WORKFLOW_ACTIONS: WorkflowAction[] = [
  "notify", "webhook", "email", "create", "update", "delete",
];

const KNOWN_APP_KEYS = [
  "name", "icon", "description", "theme", "version", "language",
];

// ─── Validator ────────────────────────────────────────────────────────────

export function validateConfig(raw: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  const push = (
    path: string,
    message: string,
    severity: "error" | "warning",
    autoFixed = false,
    fixDescription?: string,
  ) => issues.push({ path, message, severity, autoFixed, fixDescription });

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    push("root", "Config must be a JSON object", "error");
    return { valid: false, errors: issues, warnings: [] };
  }

  const cfg = raw as Record<string, unknown>;

  // ── app ──
  if (!cfg.app || typeof cfg.app !== "object") {
    push("app", "Missing required 'app' block", "error", true, "Using default app metadata");
  } else {
    const app = cfg.app as Record<string, unknown>;
    if (!app.name || String(app.name).trim() === "") {
      push("app.name", "App name is empty", "warning", true, 'Defaulting to "Unnamed App"');
    }
    if (app.icon === null || app.icon === undefined) {
      push("app.icon", "app.icon is null", "warning", true, 'Defaulting to "🌐"');
    }
    // Unknown keys
    Object.keys(app).forEach((k) => {
      if (!KNOWN_APP_KEYS.includes(k)) {
        push(`app.${k}`, `Unknown field "${k}" — will be ignored`, "warning");
      }
    });
  }

  // ── database ──
  if (!cfg.database) {
    push("database", "No database config found", "warning", true, "Using empty schema");
  } else {
    const db = cfg.database as Record<string, unknown>;
    if (!Array.isArray(db.models)) {
      push("database.models", "models must be an array", "error", true, "Using empty models array");
    } else {
      db.models.forEach((m: unknown, mi: number) => {
        if (m === null || m === undefined) {
          push(`database.models[${mi}]`, "Null model — will be skipped", "error");
          return;
        }
        if (typeof m !== "object" || Array.isArray(m)) {
          push(`database.models[${mi}]`, "Model must be an object", "error");
          return;
        }
        const model = m as Record<string, unknown>;
        const modelName = String(model.name || `Model${mi}`);

        if (!model.name) {
          push(`database.models[${mi}].name`, `Model at index ${mi} has no name`, "warning", true, `Defaulting to "Model${mi}"`);
        }
        if (!Array.isArray(model.fields)) {
          push(`${modelName}.fields`, "fields must be an array", "warning", true, "Using empty fields array");
          return;
        }
        (model.fields as unknown[]).forEach((f: unknown, fi: number) => {
          if (!f || typeof f !== "object") {
            push(`${modelName}.fields[${fi}]`, "Field must be an object", "error");
            return;
          }
          const field = f as Record<string, unknown>;
          if (!field.name) {
            push(`${modelName}.fields[${fi}].name`, "Field missing name", "warning", true, `Defaulting to "field${fi}"`);
          }
          if (!VALID_FIELD_TYPES.includes(field.type as FieldType)) {
            push(
              `${modelName}.${field.name || fi}.type`,
              `Unknown field type "${field.type}" — treating as string`,
              "warning", true, 'Coerced to "string"',
            );
          }
          if (field.type === "number" && field.default !== undefined) {
            const n = Number(field.default);
            if (isNaN(n)) {
              push(
                `${modelName}.${field.name}.default`,
                `Default value "${field.default}" is not a valid number`,
                "warning", true, "Default removed",
              );
            }
          }
          if (field.type === "enum" && !Array.isArray(field.values)) {
            push(`${modelName}.${field.name}.values`, "Enum field missing values array", "warning", true, "Defaulting to []");
          }
        });
      });
    }
  }

  // ── pages ──
  if (cfg.pages !== undefined) {
    if (!Array.isArray(cfg.pages)) {
      push("pages", "pages must be an array", "error", true, "Using empty pages array");
    } else {
      (cfg.pages as unknown[]).forEach((p: unknown, pi: number) => {
        if (p === null || p === undefined) {
          push(`pages[${pi}]`, "Null page entry — will be skipped", "error");
          return;
        }
        const page = p as Record<string, unknown>;
        if (!page.name) {
          push(`pages[${pi}].name`, "Page missing name", "warning", true, `Defaulting to "Page ${pi}"`);
        }
        if (!VALID_PAGE_TYPES.includes(page.type as PageType)) {
          push(`pages[${pi}].type`, `Unknown page type "${page.type}" — rendering as generic`, "warning", true, 'Coerced to "generic"');
        }
      });
    }
  }

  // ── auth ──
  if (cfg.auth) {
    const auth = cfg.auth as Record<string, unknown>;
    if (Array.isArray(auth.providers)) {
      (auth.providers as unknown[]).forEach((p, pi) => {
        if (!VALID_AUTH_PROVIDERS.includes(p as AuthProvider)) {
          push(`auth.providers[${pi}]`, `Unknown provider "${p}" — will be skipped`, "warning");
        }
      });
    }
  }

  // ── workflows ──
  if (cfg.workflows && Array.isArray(cfg.workflows)) {
    (cfg.workflows as unknown[]).forEach((w: unknown, wi: number) => {
      if (!w || typeof w !== "object") return;
      const wf = w as Record<string, unknown>;
      if (!wf.action || !VALID_WORKFLOW_ACTIONS.includes(wf.action as WorkflowAction)) {
        push(`workflows[${wi}].action`, `Invalid or missing action "${wf.action}"`, "warning", true, 'Defaulting to "notify"');
      }
    });
  }

  return {
    valid: !issues.some((i) => i.severity === "error" && !i.autoFixed),
    errors: issues.filter((i) => i.severity === "error"),
    warnings: issues.filter((i) => i.severity === "warning"),
  };
}

// ─── Sanitizer — always produces a valid SanitizedConfig ─────────────────

export function sanitizeConfig(raw: unknown): SanitizedConfig {
  const cfg = (typeof raw === "object" && raw !== null && !Array.isArray(raw)
    ? raw
    : {}) as Record<string, unknown>;

  const rawApp = (cfg.app && typeof cfg.app === "object" && !Array.isArray(cfg.app)
    ? cfg.app
    : {}) as Record<string, unknown>;

  const rawDb = (cfg.database && typeof cfg.database === "object"
    ? cfg.database
    : { models: [] }) as Record<string, unknown>;

  const rawAuth = (cfg.auth && typeof cfg.auth === "object"
    ? cfg.auth
    : {}) as Record<string, unknown>;

  return {
    app: {
      name:        String(rawApp.name || "Unnamed App").trim() || "Unnamed App",
      icon:        rawApp.icon ? String(rawApp.icon) : "🌐",
      description: String(rawApp.description || "Generated Application"),
      theme:       rawApp.theme === "light" ? "light" : "dark",
      version:     String(rawApp.version || "1.0.0"),
    },

    auth: {
      providers: sanitizeProviders(rawAuth.providers),
      roles:     sanitizeRoles(rawAuth.roles),
      defaultRole:     String(rawAuth.defaultRole || "user"),
      sessionDuration: String(rawAuth.sessionDuration || "7d"),
    },

    database: {
      models: sanitizeModels(rawDb.models),
      seeds:  (rawDb.seeds as Record<string, unknown[]>) || {},
    },

    pages: sanitizePages(cfg.pages),

    workflows: sanitizeWorkflows(cfg.workflows),

    ...(cfg.i18n ? { i18n: cfg.i18n as SanitizedConfig["i18n"] } : {}),
    ...(cfg.notifications ? { notifications: cfg.notifications as SanitizedConfig["notifications"] } : {}),
  };
}

function sanitizeProviders(raw: unknown): AuthProvider[] {
  if (!Array.isArray(raw)) return ["email"];
  return raw
    .filter((p): p is AuthProvider => VALID_AUTH_PROVIDERS.includes(p as AuthProvider))
    .filter((v, i, a) => a.indexOf(v) === i);
}

function sanitizeRoles(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return ["admin", "user"];
  return raw.map(String).filter(Boolean);
}

function sanitizeModels(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(Boolean)
    .map((m: unknown, mi: number) => {
      if (typeof m !== "object" || !m) return null;
      const model = m as Record<string, unknown>;
      return {
        name:       String(model.name || `Model${mi}`),
        label:      model.label ? String(model.label) : undefined,
        icon:       model.icon ? String(model.icon) : undefined,
        timestamps: model.timestamps !== false,
        softDelete: Boolean(model.softDelete),
        fields:     sanitizeFields(model.fields, String(model.name || `Model${mi}`)),
      };
    })
    .filter(Boolean) as SanitizedConfig["database"]["models"];
}

function sanitizeFields(raw: unknown, modelName: string) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(Boolean)
    .map((f: unknown, fi: number) => {
      if (typeof f !== "object" || !f) return null;
      const field = f as Record<string, unknown>;
      const type = VALID_FIELD_TYPES.includes(field.type as FieldType)
        ? (field.type as FieldType)
        : "string";
      return {
        name:       String(field.name || `field${fi}`),
        type,
        required:   Boolean(field.required),
        unique:     Boolean(field.unique),
        hidden:     Boolean(field.hidden),
        searchable: Boolean(field.searchable),
        label:      field.label ? String(field.label) : undefined,
        values:     type === "enum" && Array.isArray(field.values) ? field.values.map(String) : undefined,
        model:      type === "relation" && field.model ? String(field.model) : undefined,
        default:    sanitizeDefault(field.default, type),
      };
    })
    .filter(Boolean);
}

function sanitizeDefault(val: unknown, type: FieldType): unknown {
  if (val === undefined || val === null) return undefined;
  if (type === "number") {
    const n = Number(val);
    return isNaN(n) ? undefined : n;
  }
  if (type === "boolean") return Boolean(val);
  return val;
}

function sanitizePages(raw: unknown): SanitizedConfig["pages"] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(Boolean)
    .map((p: unknown, pi: number) => {
      if (typeof p !== "object" || !p) return null;
      const page = p as Record<string, unknown>;
      const type = VALID_PAGE_TYPES.includes(page.type as PageType)
        ? (page.type as PageType)
        : "generic";
      return {
        name:        String(page.name || `Page ${pi}`),
        icon:        page.icon ? String(page.icon) : undefined,
        type,
        model:       page.model ? String(page.model) : undefined,
        actions:     Array.isArray(page.actions) ? page.actions.map(String) : [],
        metrics:     Array.isArray(page.metrics) ? page.metrics : undefined,
        roles:       Array.isArray(page.roles) ? page.roles.map(String) : undefined,
        filters:     Array.isArray(page.filters) ? page.filters : undefined,
        columns:     Array.isArray(page.columns) ? page.columns.map(String) : undefined,
        defaultSort: page.defaultSort as { field: string; dir: "asc" | "desc" } | undefined,
      };
    })
    .filter(Boolean) as SanitizedConfig["pages"];
}

function sanitizeWorkflows(raw: unknown): SanitizedConfig["workflows"] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(Boolean)
    .map((w: unknown) => {
      if (typeof w !== "object" || !w) return null;
      const wf = w as Record<string, unknown>;
      const action = VALID_WORKFLOW_ACTIONS.includes(wf.action as WorkflowAction)
        ? (wf.action as WorkflowAction)
        : "notify";
      return {
        name:      String(wf.name || "Unnamed Workflow"),
        trigger:   String(wf.trigger || ""),
        condition: wf.condition ? String(wf.condition) : undefined,
        action,
        template:  wf.template ? String(wf.template) : undefined,
        webhook:   wf.webhook ? String(wf.webhook) : undefined,
        enabled:   wf.enabled !== false,
      };
    })
    .filter(Boolean) as SanitizedConfig["workflows"];
}
