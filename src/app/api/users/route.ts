import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RBAC } from "@/lib/rbac";
import bcrypt from "bcrypt";
import { RoleName } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const users = await prisma.user.findMany({
    where: {
      deleted: false,
      OR: q
        ? [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
    select: { id: true, email: true, name: true },
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
  const email: string | undefined = body?.email;
  const name: string | undefined = body?.name ?? undefined;
  const password: string | undefined = body?.password;
  const newRoles: string[] | undefined = Array.isArray(body?.roles) ? body.roles : undefined;
  const teamMemberships: Array<{ teamId: string; role?: string | null }> | undefined = Array.isArray(body?.teamMemberships) ? body.teamMemberships : undefined;
  if (!email || !password) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({ data: { email, name: name || null, passwordHash } });
    const ops: Array<any> = [];
    if (newRoles && newRoles.length > 0) {
      const roleRecords = await prisma.role.findMany({ where: { name: { in: newRoles as RoleName[] } } });
      for (const r of roleRecords) ops.push(prisma.userRole.create({ data: { userId: created.id, roleId: r.id } }));
    }
    if (teamMemberships && teamMemberships.length > 0) {
      for (const tm of teamMemberships) ops.push(prisma.teamMember.create({ data: { userId: created.id, teamId: tm.teamId, role: tm.role ?? "Member" } }));
    }
    if (ops.length > 0) await prisma.$transaction(ops);
    await prisma.activityLog.create({ data: { userId: (session as any).user?.id, action: "UserCreate", entityType: "User", metadata: { targetUserId: created.id } } });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "create failed" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageAll(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const body = await req.json();
  const data: any = {};
  if (typeof body.email === "string" && body.email.trim().length > 0) data.email = body.email.trim();
  if (typeof body.name === "string") data.name = body.name;
  try {
    const updated = Object.keys(data).length > 0 ? await prisma.user.update({ where: { id }, data }) : await prisma.user.findUnique({ where: { id } });
    const ops: Array<any> = [];
    if (Array.isArray(body.roles)) {
      const desired: RoleName[] = body.roles as RoleName[];
      const current = await prisma.userRole.findMany({ where: { userId: id }, include: { role: true } });
      const have = current.map((ur) => ur.role.name);
      const toAdd = desired.filter((r) => !have.includes(r));
      const toRemove = current.filter((ur) => !desired.includes(ur.role.name));
      if (toAdd.length > 0) {
        const roleRecords = await prisma.role.findMany({ where: { name: { in: toAdd } } });
        for (const r of roleRecords) ops.push(prisma.userRole.create({ data: { userId: id, roleId: r.id } }));
      }
      if (toRemove.length > 0) {
        for (const ur of toRemove) ops.push(prisma.userRole.delete({ where: { userId_roleId: { userId: id, roleId: ur.roleId } } }));
      }
    }
    if (Array.isArray(body.teamMemberships)) {
      const desired = body.teamMemberships as Array<{ teamId: string; role?: string | null }>;
      const current = await prisma.teamMember.findMany({ where: { userId: id } });
      const desiredIds = desired.map((tm) => tm.teamId);
      const haveIds = current.map((tm) => tm.teamId);
      const toAdd = desired.filter((tm) => !haveIds.includes(tm.teamId));
      const toRemove = current.filter((tm) => !desiredIds.includes(tm.teamId));
      const toMaybeUpdate = desired.filter((tm) => haveIds.includes(tm.teamId));
      for (const tm of toAdd) ops.push(prisma.teamMember.create({ data: { userId: id, teamId: tm.teamId, role: tm.role ?? null } }));
      for (const tm of toRemove) ops.push(prisma.teamMember.delete({ where: { teamId_userId: { teamId: tm.teamId, userId: id } } }));
      for (const tm of toMaybeUpdate) {
        const currentRec = current.find((c) => c.teamId === tm.teamId);
        const desiredRole = tm.role ?? null;
        if (currentRec && currentRec.role !== desiredRole) ops.push(prisma.teamMember.update({ where: { teamId_userId: { teamId: tm.teamId, userId: id } }, data: { role: desiredRole } }));
      }
    }
    if (ops.length > 0) await prisma.$transaction(ops);
    await prisma.activityLog.create({ data: { userId: (session as any).user?.id, action: "UserUpdate", entityType: "User", metadata: { targetUserId: id } } });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "update failed" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageAll(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  try {
    await prisma.user.update({ where: { id }, data: { deleted: true } });
    await prisma.session.deleteMany({ where: { userId: id } });
    await prisma.account.deleteMany({ where: { userId: id } });
    await prisma.activityLog.create({ data: { userId: (session as any).user?.id, action: "UserDelete", entityType: "User", metadata: { targetUserId: id } } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "delete failed" }, { status: 400 });
  }
}

