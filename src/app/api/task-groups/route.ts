import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RBAC } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles) && !RBAC.canViewAssignedTasks(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const groups = await (prisma as any).taskGroup.findMany({
    where: {
      projectId,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const projectId: string | undefined = body.projectId;
  const name: string | undefined = body.name;
  if (!projectId || !name || !name.trim()) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const created = await (prisma as any).taskGroup.create({ data: { projectId, name: name.trim() } });
  await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId, action: "TaskGroupCreate", entityType: "TaskGroup", metadata: { id: created.id, name: created.name } } });
  return NextResponse.json(created, { status: 201 });
}
