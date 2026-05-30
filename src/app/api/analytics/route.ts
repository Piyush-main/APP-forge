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

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days

  const [events, workflowLogs] = await prisma.$transaction([
    prisma.analyticsEvent.groupBy({
      by:    ["event"],
      where: { appId: { in: appIds }, createdAt: { gte: since } },
      _count: { event: true },
    }),
    prisma.workflowLog.groupBy({
      by:    ["result"],
      where: { appId: { in: appIds }, createdAt: { gte: since } },
      _count: { result: true },
    }),
  ]);

  return ok({
    period:    "30d",
    events:    Object.fromEntries(events.map((e) => [e.event, e._count.event])),
    workflows: Object.fromEntries(workflowLogs.map((w) => [w.result, w._count.result])),
    appCount:  appIds.length,
  });
}
