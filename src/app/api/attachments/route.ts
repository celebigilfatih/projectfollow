import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig as any);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "missing file" }, { status: 400 });
  const taskId = form.get("taskId") as string | null;
  const projectId = form.get("projectId") as string | null;
  const noteId = form.get("noteId") as string | null;
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const uploadsDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const name = `${Date.now()}-${file.name}`;
  const filePath = join(uploadsDir, name);
  await writeFile(filePath, buffer);
  const created = await prisma.attachment.create({
    data: {
      taskId: taskId ?? undefined,
      projectId: projectId ?? undefined,
      noteId: noteId ?? undefined,
      fileName: file.name,
      mimeType: file.type,
      size: buffer.length,
      url: `/uploads/${name}`,
    },
  });
  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  await prisma.attachment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
