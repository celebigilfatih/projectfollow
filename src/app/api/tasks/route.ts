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
  const assignedTeamId = req.nextUrl.searchParams.get("assignedTeamId") ?? undefined;
  const status = req.nextUrl.searchParams.get("status") as any;
  const priority = req.nextUrl.searchParams.get("priority") as any;
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const mine = req.nextUrl.searchParams.get("mine");
  const userId = (session as any).user?.id as string | undefined;
  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      assignedToId: mine ? userId : assignedToId,
      assignedTeamId,
      status: status || undefined,
      priority: priority || undefined,
      OR: q
        ? [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: { subtasks: true, comments: true, attachments: true, assignedTo: true, assignedTeam: true, project: true, assignees: { include: { user: true } } },
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
  const assigneeIds: string[] | undefined = Array.isArray(body.assigneeIds) ? body.assigneeIds : undefined;
  const data: any = { ...body };
  delete data.assigneeIds;
  if (typeof data.dueDate === "string" && data.dueDate) data.dueDate = new Date(data.dueDate);
  if (typeof data.startDate === "string" && data.startDate) data.startDate = new Date(data.startDate);
  if (typeof data.assignedToId === "string" && data.assignedToId.trim() === "") delete data.assignedToId;
  if (typeof data.assignedTeamId === "string" && data.assignedTeamId.trim() === "") delete data.assignedTeamId;
  const created = await prisma.task.create({ data });
  if (assigneeIds && assigneeIds.length > 0) {
    await prisma.$transaction(assigneeIds.map((uid) => prisma.taskAssignee.create({ data: { taskId: created.id, userId: uid } })));
  }
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
  const assigneeIds: string[] | undefined = Array.isArray(body.assigneeIds) ? body.assigneeIds : undefined;
  const data: any = { ...body };
  delete data.assigneeIds;
  if (typeof data.dueDate === "string" && data.dueDate) data.dueDate = new Date(data.dueDate);
  if (typeof data.startDate === "string" && data.startDate) data.startDate = new Date(data.startDate);
  if (typeof data.assignedToId === "string" && data.assignedToId.trim() === "") delete data.assignedToId;
  if (typeof data.assignedTeamId === "string" && data.assignedTeamId.trim() === "") delete data.assignedTeamId;
  const updated = await prisma.task.update({ where: { id }, data });
  if (assigneeIds) {
    const current = await prisma.taskAssignee.findMany({ where: { taskId: id } });
    const currentIds = current.map((x) => x.userId);
    const desiredIds = assigneeIds;
    const toAdd = desiredIds.filter((uid) => !currentIds.includes(uid));
    const toRemove = current.filter((x) => !desiredIds.includes(x.userId));
    await prisma.$transaction([
      ...toAdd.map((uid) => prisma.taskAssignee.create({ data: { taskId: id, userId: uid } })),
      ...toRemove.map((rec) => prisma.taskAssignee.delete({ where: { taskId_userId: { taskId: rec.taskId, userId: rec.userId } } })),
    ]);
  }
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
  await prisma.taskAssignee.deleteMany({ where: { taskId: id } });
  await prisma.subtask.deleteMany({ where: { taskId: id } });
  await prisma.task.delete({ where: { id } });
  await prisma.activityLog.create({ data: { userId: (session as any).user?.id, taskId: id, action: "TaskDelete", entityType: "Task" } });
  return NextResponse.json({ ok: true });
}
