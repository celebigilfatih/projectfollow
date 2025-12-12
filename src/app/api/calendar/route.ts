import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = req.nextUrl.searchParams.get("userId") ?? undefined;
  const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;
  const events = await prisma.calendarEvent.findMany({
    where: { userId, task: projectId ? { projectId } : undefined },
    include: { task: true },
    orderBy: { start: "asc" },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await req.json();
  const created = await prisma.calendarEvent.create({ data });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const data = await req.json();
  const updated = await prisma.calendarEvent.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  await prisma.calendarEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
