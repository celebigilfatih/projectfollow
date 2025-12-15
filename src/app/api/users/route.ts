import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RBAC } from "@/lib/rbac";
import bcrypt from "bcrypt";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const users = await prisma.user.findMany({
    where: {
      deleted: false,
      OR: q ? [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] : undefined,
    },
    include: { roles: { include: { role: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageAll(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const passwordHash = await bcrypt.hash(body.password, 10);
  const created = await prisma.user.create({ data: { email: body.email, name: body.name, passwordHash } });
  if (body.roles && Array.isArray(body.roles)) {
    for (const r of body.roles) {
      const role = await prisma.role.upsert({ where: { name: r }, update: {}, create: { name: r } });
      await prisma.userRole.create({ data: { userId: created.id, roleId: role.id } });
    }
  }
  if (Array.isArray(body.teamMemberships) && body.teamMemberships.length > 0) {
    await prisma.$transaction(
      (body.teamMemberships as Array<{ teamId: string; role?: string | null }>).map((d) =>
        prisma.teamMember.create({ data: { teamId: d.teamId, userId: created.id, role: d.role ?? null } })
      )
    );
  } else if (Array.isArray(body.teamIds) && body.teamIds.length > 0) {
    await prisma.$transaction(body.teamIds.map((tid: string) => prisma.teamMember.create({ data: { teamId: tid, userId: created.id } })));
  } else if (typeof body.teamId === "string" && body.teamId) {
    await prisma.teamMember.create({ data: { teamId: body.teamId, userId: created.id } });
  }
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageAll(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const body = await req.json();
  const data: any = { email: body.email, name: body.name };
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);
  const updated = await prisma.user.update({ where: { id }, data });
  if (Array.isArray(body.roles)) {
    const roleRecords = await prisma.role.findMany({ where: { name: { in: body.roles } } });
    const current = await prisma.userRole.findMany({ where: { userId: id } });
    const desiredIds = roleRecords.map((r) => r.id);
    const toAdd = desiredIds.filter((rid) => !current.find((c) => c.roleId === rid));
    const toRemove = current.filter((c) => !desiredIds.includes(c.roleId));
    for (const rid of toAdd) await prisma.userRole.create({ data: { userId: id, roleId: rid } });
    for (const rem of toRemove) await prisma.userRole.delete({ where: { userId_roleId: { userId: rem.userId, roleId: rem.roleId } } });
  }
  if (Array.isArray(body.teamMemberships)) {
    const currentTeams = await prisma.teamMember.findMany({ where: { userId: id } });
    const desired = body.teamMemberships as Array<{ teamId: string; role?: string | null }>;
    const desiredTeamIds = desired.map((d) => d.teamId);
    const toAddTeams = desired.filter((d) => !currentTeams.find((c) => c.teamId === d.teamId));
    const toRemoveTeams = currentTeams.filter((c) => !desiredTeamIds.includes(c.teamId));
    for (const d of toAddTeams) await prisma.teamMember.create({ data: { userId: id, teamId: d.teamId, role: d.role ?? null } });
    for (const rem of toRemoveTeams) await prisma.teamMember.delete({ where: { teamId_userId: { teamId: rem.teamId, userId: rem.userId } } });
    for (const d of desired) {
      const existing = currentTeams.find((c) => c.teamId === d.teamId);
      if (existing && existing.role !== (d.role ?? null)) {
        await prisma.teamMember.update({ where: { teamId_userId: { teamId: existing.teamId, userId: existing.userId } }, data: { role: d.role ?? null } });
      }
    }
  } else if (Array.isArray(body.teamIds)) {
    const currentTeams = await prisma.teamMember.findMany({ where: { userId: id } });
    const desiredTeamIds = body.teamIds as string[];
    const toAddTeams = desiredTeamIds.filter((tid) => !currentTeams.find((c) => c.teamId === tid));
    const toRemoveTeams = currentTeams.filter((c) => !desiredTeamIds.includes(c.teamId));
    for (const tid of toAddTeams) await prisma.teamMember.create({ data: { userId: id, teamId: tid } });
    for (const rem of toRemoveTeams) await prisma.teamMember.delete({ where: { teamId_userId: { teamId: rem.teamId, userId: rem.userId } } });
  }
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageAll(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.account.deleteMany({ where: { userId: id } });
  await prisma.user.update({ where: { id }, data: { deleted: true } });
  return NextResponse.json({ ok: true });
}
