import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RBAC } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const teams = await prisma.team.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    include: { members: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(teams);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles) && !RBAC.canManageAll(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const created = await prisma.team.create({ data: { name: body.name, description: body.description } });
  await prisma.activityLog.create({ data: { userId: (session as any).user?.id, teamId: created.id, action: "TeamCreate", entityType: "Team" } });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles) && !RBAC.canManageAll(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const body = await req.json();
  const updated = await prisma.team.update({ where: { id }, data: { name: body.name, description: body.description } });
  await prisma.activityLog.create({ data: { userId: (session as any).user?.id, teamId: id, action: "TeamUpdate", entityType: "Team" } });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles) && !RBAC.canManageAll(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  await prisma.teamMember.deleteMany({ where: { teamId: id } });
  await prisma.activityLog.deleteMany({ where: { teamId: id } });
  await prisma.task.updateMany({ where: { assignedTeamId: id }, data: { assignedTeamId: null } });
  await prisma.team.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
