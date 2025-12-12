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
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : undefined,
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
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageAll(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  await prisma.userRole.deleteMany({ where: { userId: id } });
  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.account.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
