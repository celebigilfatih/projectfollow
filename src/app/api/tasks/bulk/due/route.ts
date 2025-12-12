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
  const { ids, dueDate } = body as { ids: string[]; dueDate?: string | null };
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "invalid ids" }, { status: 400 });
  let target: Date | null = null;
  if (typeof dueDate === "string" && dueDate.trim().length > 0) {
    const d = new Date(dueDate);
    if (isNaN(d.getTime())) return NextResponse.json({ error: "invalid date" }, { status: 400 });
    target = d;
  }
  await prisma.$transaction(ids.map((id) => prisma.task.update({ where: { id }, data: { dueDate: target } })));
  return NextResponse.json({ ok: true });
}

