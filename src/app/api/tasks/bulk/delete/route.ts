import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RBAC } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const { ids } = body as { ids: string[] };
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "invalid ids" }, { status: 400 });
  for (const id of ids) {
    await prisma.$transaction([
      prisma.attachment.deleteMany({ where: { taskId: id } }),
      prisma.taskComment.deleteMany({ where: { taskId: id } }),
      prisma.taskAssignee.deleteMany({ where: { taskId: id } }),
      prisma.subtask.deleteMany({ where: { taskId: id } }),
      prisma.task.delete({ where: { id } }),
    ]);
    await prisma.activityLog.create({ data: { userId: (session as any).user?.id, taskId: id, action: "TaskDelete", entityType: "Task" } });
  }
  return NextResponse.json({ ok: true });
}
