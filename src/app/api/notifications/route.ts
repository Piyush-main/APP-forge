import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ok, err, unauthorized, paginated } from "@/lib/runtime/api-handler";

// ─── GET /api/notifications ───────────────────────────────────────────────
// Returns workflow logs as notifications for the current user's apps

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const url    = new URL(req.url);
  const page   = parseInt(url.searchParams.get("page")  || "1",  10);
  const limit  = parseInt(url.searchParams.get("limit") || "20", 10);
  const unread = url.searchParams.get("unread") === "true";

  // Get user's app IDs
  const userApps = await prisma.app.findMany({
    where:  { userId: session.user.id },
    select: { id: true },
  });
  const appIds = userApps.map((a) => a.id);

  const where = {
    appId: { in: appIds },
    result: "success" as const,
    ...(unread ? { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } : {}),
  };

  const [logs, total] = await prisma.$transaction([
    prisma.workflowLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * limit,
      take:  limit,
      include: {
        app: { select: { name: true, icon: true } },
      },
    }),
    prisma.workflowLog.count({ where }),
  ]);

  const notifications = logs.map((l) => ({
    id:        l.id,
    appId:     l.appId,
    appName:   (l.app as { name: string; icon: string }).name,
    appIcon:   (l.app as { name: string; icon: string }).icon,
    workflow:  l.workflow,
    message:   l.message,
    createdAt: l.createdAt,
  }));

  return paginated(notifications, total, page, limit);
}

// ─── POST /api/notifications/mark-read ───────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const body = await req.json().catch(() => ({}));
  // In a real system, we'd track read state per user.
  // For the demo, we acknowledge the request.
  return ok({ marked: body.ids?.length ?? 0 });
}
