import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/runtime/api-handler";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const url   = new URL(req.url);
  const appId = url.searchParams.get("appId");

  const userApps = await prisma.app.findMany({
    where:  { userId: session.user.id, ...(appId ? { id: appId } : {}) },
    select: { id: true },
  });
  const appIds = userApps.map((a) => a.id);

  if (appIds.length === 0) {
    return ok({ period: "30d", events: {}, workflows: {}, appCount: 0 });
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Use raw queries to avoid Prisma groupBy circular type bug
  const eventRows = await prisma.$queryRawUnsafe<{ event: string; count: bigint }[]>(
    `SELECT event, COUNT(*) as count FROM analytics_events
     WHERE app_id = ANY($1::text[]) AND created_at >= $2
     GROUP BY event`,
    appIds,
    since,
  ).catch(() => [] as { event: string; count: bigint }[]);

  const workflowRows = await prisma.$queryRawUnsafe<{ result: string; count: bigint }[]>(
    `SELECT result, COUNT(*) as count FROM workflow_logs
     WHERE app_id = ANY($1::text[]) AND created_at >= $2
     GROUP BY result`,
    appIds,
    since,
  ).catch(() => [] as { result: string; count: bigint }[]);

  return ok({
    period:    "30d",
    events:    Object.fromEntries(eventRows.map((e) => [e.event, Number(e.count)])),
    workflows: Object.fromEntries(workflowRows.map((w) => [w.result, Number(w.count)])),
    appCount:  appIds.length,
  });
}