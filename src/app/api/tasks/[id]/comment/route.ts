import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id } = await params;
  const created = await prisma.taskComment.create({ data: { taskId: id, userId: (session as any).user?.id, content: body.content } });
  return NextResponse.json(created, { status: 201 });
}
