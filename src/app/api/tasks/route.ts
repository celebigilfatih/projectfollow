import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RBAC } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;
  const assignedToId = req.nextUrl.searchParams.get("assignedToId") ?? undefined;
  const status = req.nextUrl.searchParams.get("status") as any;
  const priority = req.nextUrl.searchParams.get("priority") as any;
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const mine = req.nextUrl.searchParams.get("mine");
  const userId = (session as any).user?.id as string | undefined;
  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      assignedToId: mine ? userId : assignedToId,
      status: status || undefined,
      priority: priority || undefined,
      OR: q
        ? [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: { subtasks: true, comments: true, attachments: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles) && !RBAC.canViewAssignedTasks(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const data: any = { ...body };
  if (typeof data.dueDate === "string" && data.dueDate) data.dueDate = new Date(data.dueDate);
  if (typeof data.startDate === "string" && data.startDate) data.startDate = new Date(data.startDate);
  const created = await prisma.task.create({ data });
  await prisma.activityLog.create({ data: { userId: (session as any).user?.id, taskId: created.id, projectId: created.projectId, action: "TaskCreate", entityType: "Task" } });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles) && !RBAC.canViewAssignedTasks(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const body = await req.json();
  const data: any = { ...body };
  if (typeof data.dueDate === "string" && data.dueDate) data.dueDate = new Date(data.dueDate);
  if (typeof data.startDate === "string" && data.startDate) data.startDate = new Date(data.startDate);
  const updated = await prisma.task.update({ where: { id }, data });
  await prisma.activityLog.create({ data: { userId: (session as any).user?.id, taskId: id, projectId: updated.projectId, action: "TaskUpdate", entityType: "Task" } });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  await prisma.attachment.deleteMany({ where: { taskId: id } });
  await prisma.taskComment.deleteMany({ where: { taskId: id } });
  await prisma.subtask.deleteMany({ where: { taskId: id } });
  await prisma.task.delete({ where: { id } });
  await prisma.activityLog.create({ data: { userId: (session as any).user?.id, taskId: id, action: "TaskDelete", entityType: "Task" } });
  return NextResponse.json({ ok: true });
}
