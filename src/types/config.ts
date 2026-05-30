// ─── AppForge Config Types ────────────────────────────────────────────────
// These types represent the JSON schema that users drop into the builder.
// All fields are optional at the raw level; the runtime sanitizer fills gaps.

export type FieldType =
  | "string" | "text" | "richtext"
  | "number" | "boolean" | "email"
  | "datetime" | "date" | "time"
  | "enum" | "relation" | "array" | "image" | "file"
  | "json";

export interface FieldDef {
  name: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  default?: unknown;
  values?: string[];          // for enum
  model?: string;             // for relation
  label?: string;             // display override
  hidden?: boolean;           // hide from UI
  searchable?: boolean;
}

export interface ModelDef {
  name: string;
  fields: FieldDef[];
  timestamps?: boolean;       // default true — adds createdAt/updatedAt
  softDelete?: boolean;
  label?: string;
  icon?: string;
}

export interface MetricDef {
  label: string;
  field: string;              // e.g. "Contact.count" | "Deal.sum.amount"
  color?: "blue" | "green" | "amber" | "red" | "purple";
  prefix?: string;
  suffix?: string;
  description?: string;
}

export type PageAction =
  | "create" | "edit" | "delete"
  | "import_csv" | "export_csv"
  | "view" | "duplicate";

export type PageType =
  | "dashboard" | "table" | "form"
  | "settings" | "calendar" | "kanban"
  | "chart" | "detail" | "generic";

export interface PageDef {
  name: string;
  icon?: string;
  type: PageType;
  model?: string;             // for table/form/detail
  actions?: PageAction[];
  metrics?: MetricDef[];
  columns?: string[];         // column subset for table
  filters?: FilterDef[];
  defaultSort?: { field: string; dir: "asc" | "desc" };
  roles?: string[];           // restrict access
}

export interface FilterDef {
  field: string;
  operator: "eq" | "neq" | "gt" | "lt" | "contains" | "in";
  value?: unknown;
  label?: string;
}

export type AuthProvider = "email" | "google" | "github" | "facebook" | "twitter" | "azure";
export type WorkflowAction = "notify" | "webhook" | "email" | "create" | "update" | "delete";

export interface WorkflowDef {
  name: string;
  trigger: string;            // e.g. "Contact.create"
  condition?: string;         // e.g. "status == lead"
  action: WorkflowAction;
  template?: string;          // notification template with {{field}} interpolation
  webhook?: string;
  email?: { to: string; subject: string; body: string };
  enabled?: boolean;
}

export interface AuthConfig {
  providers: AuthProvider[];
  roles: string[];
  defaultRole?: string;
  sessionDuration?: string;
}

export interface ThemeConfig {
  primary?: string;
  mode?: "light" | "dark" | "system";
  font?: string;
  borderRadius?: "none" | "sm" | "md" | "lg";
}

export interface I18nConfig {
  defaultLocale: string;
  locales: string[];
}

export interface NotificationConfig {
  email?: { from: string; smtp?: string };
  push?: boolean;
  inApp?: boolean;
}

// ─── Root Config ─────────────────────────────────────────────────────────

export interface AppConfig {
  app: {
    name: string;
    icon?: string;
    description?: string;
    theme?: "light" | "dark" | string;
    version?: string;
    language?: string;
    [key: string]: unknown;   // gracefully ignore unknown keys
  };
  auth?: AuthConfig;
  database?: {
    models: ModelDef[];
    seeds?: Record<string, unknown[]>;
  };
  pages?: PageDef[];
  workflows?: WorkflowDef[];
  i18n?: I18nConfig;
  notifications?: NotificationConfig;
  theme?: ThemeConfig;
}

// ─── Sanitized / normalized config (post-validation) ─────────────────────

export interface SanitizedConfig extends Required<Pick<AppConfig, "app" | "auth" | "database" | "pages" | "workflows">> {
  app: {
    name: string;
    icon: string;
    description: string;
    theme: "light" | "dark";
    version: string;
  };
  auth: Required<AuthConfig>;
  i18n?: I18nConfig;
  notifications?: NotificationConfig;
}

// ─── Validation result ────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
  autoFixed?: boolean;
  fixDescription?: string;
}

// ─── Runtime types ────────────────────────────────────────────────────────

export interface GeneratedRoute {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  model?: string;
  feature?: string;
}

export interface GeneratedSchema {
  tableName: string;
  model: ModelDef;
  sql: string;
  prismaModel: string;
}

export interface GenerationResult {
  config: SanitizedConfig;
  validation: ValidationResult;
  routes: GeneratedRoute[];
  schemas: GeneratedSchema[];
  envVars: Record<string, string>;
  deployTargets: DeployTarget[];
}

export interface DeployTarget {
  name: string;
  platform: "vercel" | "railway" | "render" | "neon" | "cloudflare";
  url: string;
  cost: string;
  recommended: boolean;
  features: string[];
}