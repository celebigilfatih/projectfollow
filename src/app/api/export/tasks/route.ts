import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TaskStatus, Priority } from "@prisma/client";

function esc(v: any) {
  const s = v === null || v === undefined ? "" : String(v);
  const q = '"';
  const needs = s.includes(",") || s.includes("\n") || s.includes(q);
  const e = s.replaceAll(q, '""');
  return needs ? q + e + q : e;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session as any).user?.id as string | undefined;
  const sp = req.nextUrl.searchParams;
  const projectId = sp.get("projectId") ?? undefined;
  const status = sp.get("status") as TaskStatus | null;
  const priority = sp.get("priority") as Priority | null;
  const view = sp.get("view") ?? "mine";
  const startDateStr = sp.get("startDate") ?? undefined;
  const endDateStr = sp.get("endDate") ?? undefined;
  let dateRange: { gte?: Date; lt?: Date } | undefined = undefined;
  if (startDateStr || endDateStr) {
    const sd = startDateStr ? new Date(startDateStr) : undefined;
    const ed = endDateStr ? new Date(endDateStr) : undefined;
    if (sd && !isNaN(sd.getTime())) {
      dateRange = { ...(dateRange || {}), gte: sd };
    }
    if (ed && !isNaN(ed.getTime())) {
      dateRange = { ...(dateRange || {}), lt: ed };
    }
  }
  const where: any = {
    projectId: projectId || undefined,
    status: status || undefined,
    priority: priority || undefined,
    dueDate: dateRange,
    assignedToId: view === "all" ? undefined : userId,
  };
  const tasks = await prisma.task.findMany({
    where,
    include: { assignedTo: true, assignedTeam: true, project: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  const head = ["id", "title", "project", "status", "priority", "assignedTo", "assignedTeam", "dueDate", "updatedAt"].join(",");
  const rows = tasks.map((t) => [
    esc(t.id),
    esc(t.title),
    esc(t.project?.title ?? t.projectId),
    esc(t.status),
    esc(t.priority),
    esc(t.assignedTo?.name ?? t.assignedTo?.email ?? t.assignedToId ?? ""),
    esc(t.assignedTeam?.name ?? t.assignedTeamId ?? ""),
    esc(t.dueDate ? new Date(t.dueDate).toISOString() : ""),
    esc(new Date(t.updatedAt).toISOString()),
  ].join(","));
  const csv = [head, ...rows].join("\n");
  const res = new NextResponse(csv, { status: 200 });
  res.headers.set("content-type", "text/csv; charset=utf-8");
  res.headers.set("content-disposition", "attachment; filename=tasks.csv");
  return res;
}

