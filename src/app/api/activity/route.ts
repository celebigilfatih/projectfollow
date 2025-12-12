import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;
  const taskId = req.nextUrl.searchParams.get("taskId") ?? undefined;
  const logs = await prisma.activityLog.findMany({
    where: { projectId, taskId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const created = await prisma.activityLog.create({ data: { ...body, userId: (session as any).user?.id } });
  return NextResponse.json(created, { status: 201 });
}
