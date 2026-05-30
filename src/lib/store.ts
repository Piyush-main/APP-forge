import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GenerationResult } from "@/types/config";

interface LogEntry {
  id:    string;
  level: "info" | "warn" | "err" | "ok";
  msg:   string;
  time:  string;
}

interface BuilderState {
  // Editor
  json:      string;
  jsonError: string | null;
  setJson:   (v: string) => void;

  // Generation
  result:    GenerationResult | null;
  loading:   boolean;
  setResult: (r: GenerationResult | null) => void;
  setLoading:(v: boolean) => void;

  // UI
  tab:       "preview" | "schema" | "routes" | "auth" | "deploy";
  activePage: number;
  setTab:    (t: BuilderState["tab"]) => void;
  setActivePage: (i: number) => void;

  // Features
  features: {
    csv:    boolean;
    notify: boolean;
    i18n:   boolean;
    pwa:    boolean;
    github: boolean;
  };
  toggleFeature: (f: keyof BuilderState["features"]) => void;

  // Logs
  logs:   LogEntry[];
  addLog: (level: LogEntry["level"], msg: string) => void;
  clearLogs: () => void;
}

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set, get) => ({
      json:      "",
      jsonError: null,
      setJson: (json) => {
        let jsonError: string | null = null;
        try { JSON.parse(json); } catch (e) { jsonError = (e as Error).message.split("\n")[0]; }
        set({ json, jsonError });
      },

      result:    null,
      loading:   false,
      setResult: (result) => set({ result }),
      setLoading:(loading) => set({ loading }),

      tab:        "preview",
      activePage: 0,
      setTab:     (tab) => set({ tab }),
      setActivePage: (activePage) => set({ activePage }),

      features: { csv: true, notify: true, i18n: true, pwa: false, github: false },
      toggleFeature: (f) =>
        set((s) => ({ features: { ...s.features, [f]: !s.features[f] } })),

      logs: [],
      addLog: (level, msg) => {
        const time = new Date().toLocaleTimeString("en-US", { hour12: false });
        const id   = `${Date.now()}-${Math.random()}`;
        set((s) => ({ logs: [...s.logs.slice(-99), { id, level, msg, time }] }));
      },
      clearLogs: () => set({ logs: [] }),
    }),
    {
      name:    "appforge-builder",
      // Only persist editor content + features, not transient state
      partialize: (s) => ({ json: s.json, features: s.features }),
    },
  ),
);

// ─── Notification store ───────────────────────────────────────────────────

interface Notification {
  id:       string;
  appName:  string;
  appIcon:  string;
  workflow: string;
  message:  string;
  createdAt: string;
  read:     boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount:   number;
  fetch:         () => Promise<void>;
  markRead:      (ids: string[]) => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount:   0,

  fetch: async () => {
    try {
      const res  = await fetch("/api/notifications?limit=10");
      const data = await res.json();
      if (data.success) {
        const notifications = data.data.map((n: Omit<Notification, "read">) => ({
          ...n, read: false,
        }));
        set({ notifications, unreadCount: notifications.length });
      }
    } catch { /* silent */ }
  },

  markRead: (ids) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        ids.includes(n.id) ? { ...n, read: true } : n,
      ),
      unreadCount: Math.max(0, s.unreadCount - ids.length),
    }));
    fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ids }),
    }).catch(() => {});
  },
}));
