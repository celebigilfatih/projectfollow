import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import TaskDetailClient from "@/components/task-detail-client";

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authConfig as any);
  if (!session) return redirect("/login");
  const { id } = await (params as any);
  const task = await prisma.task.findUnique({ where: { id }, include: { subtasks: true, comments: { include: { user: true } }, attachments: true, project: true, assignees: { include: { user: true } }, taskGroup: true } as any });
  if (!task) return notFound();
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
  const rawTeams = await prisma.team.findMany({ include: { members: { include: { user: true } } } });
  const teams = rawTeams.map((t: any) => ({ id: t.id, name: t.name, managerName: (() => { const lead = Array.isArray(t.members) ? t.members.find((m: any) => m.role === "Manager" || m.role === "Lead") : null; const nm = lead?.user?.name ?? lead?.user?.email ?? null; return nm || null; })() }));
  return (
    <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
      <TaskDetailClient task={task} users={users} teams={teams} />
    </div>
  );
}
