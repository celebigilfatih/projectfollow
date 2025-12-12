import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TaskStatus } from "@prisma/client";
import { RBAC } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const { projectId, status, ids } = body as { projectId: string; status: TaskStatus | string; ids: string[] };
  if (!projectId || !status || !Array.isArray(ids)) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const s = status as TaskStatus;
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.task.update({ where: { id }, data: { position: index + 1, status: s } })
    )
  );
  return NextResponse.json({ ok: true });
}
