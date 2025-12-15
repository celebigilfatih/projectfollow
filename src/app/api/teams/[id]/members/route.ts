import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RBAC } from "@/lib/rbac";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const members = await prisma.teamMember.findMany({ where: { teamId: id }, include: { user: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(members);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles) && !RBAC.canManageAll(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const { id } = await params;
  const created = await prisma.teamMember.create({ data: { teamId: id, userId: body.userId, role: body.role } });
  await prisma.activityLog.create({ data: { userId: (session as any).user?.id, teamId: id, action: "TeamMemberAdd", entityType: "TeamMember", metadata: { targetUserId: body.userId } } });
  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles) && !RBAC.canManageAll(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const userId = req.nextUrl.searchParams.get("userId");
  const { id } = await params;
  if (!userId) return NextResponse.json({ error: "missing userId" }, { status: 400 });
  await prisma.teamMember.delete({ where: { teamId_userId: { teamId: id, userId } } });
  await prisma.activityLog.create({ data: { userId: (session as any).user?.id, teamId: id, action: "TeamMemberRemove", entityType: "TeamMember", metadata: { targetUserId: userId } } });
  return NextResponse.json({ ok: true });
}
