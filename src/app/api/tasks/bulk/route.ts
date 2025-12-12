import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RBAC } from "@/lib/rbac";
import { TaskStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const { ids, status } = body as { ids: string[]; status: TaskStatus | string };
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "invalid ids" }, { status: 400 });
  const s = status as TaskStatus;
  await prisma.$transaction(ids.map((id) => prisma.task.update({ where: { id }, data: { status: s } })));
  return NextResponse.json({ ok: true });
}
