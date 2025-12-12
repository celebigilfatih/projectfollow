import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RBAC } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "missing projectId" }, { status: 400 });
  const notes = await prisma.projectNote.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const data = await req.json();
  const created = await prisma.projectNote.create({ data });
  await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: created.projectId, action: "NoteCreate", entityType: "ProjectNote" } });
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
  const updated = await prisma.projectNote.update({ where: { id }, data });
  await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: updated.projectId, action: "NoteUpdate", entityType: "ProjectNote" } });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  await prisma.attachment.deleteMany({ where: { noteId: id } });
  const deleted = await prisma.projectNote.delete({ where: { id } });
  await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: deleted.projectId, action: "NoteDelete", entityType: "ProjectNote" } });
  return NextResponse.json({ ok: true });
}
