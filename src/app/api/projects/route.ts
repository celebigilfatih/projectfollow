import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RBAC } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const status = req.nextUrl.searchParams.get("status") as any;
  const responsibleId = req.nextUrl.searchParams.get("responsibleId") ?? undefined;
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const projects = await prisma.project.findMany({
    where: {
      status: status || undefined,
      responsibleId,
      OR: q
        ? [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: { responsible: true, tasks: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const data = await req.json();
  const created = await prisma.project.create({ data });
  await prisma.activityLog.create({
    data: { userId: (session as any).user?.id, projectId: created.id, action: "ProjectCreate", entityType: "Project" },
  });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const data = await req.json();
  const updated = await prisma.project.update({ where: { id }, data });
  await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: id, action: "ProjectUpdate", entityType: "Project" } });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageAll(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  await prisma.attachment.deleteMany({ where: { projectId: id } });
  await prisma.task.deleteMany({ where: { projectId: id } });
  await prisma.project.delete({ where: { id } });
  await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: id, action: "ProjectDelete", entityType: "Project" } });
  return NextResponse.json({ ok: true });
}
