import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import TaskDetailClient from "@/components/task-detail-client";

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authConfig as any);
  if (!session) return redirect("/login");
  const task = await prisma.task.findUnique({ where: { id: params.id }, include: { subtasks: true, comments: { include: { user: true } }, attachments: true, project: true } });
  if (!task) return notFound();
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <TaskDetailClient task={task} users={users} />
    </div>
  );
}
