import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Eye, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RBAC } from "@/lib/rbac";

export default async function TasksPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const session = await getServerSession(authConfig as any);
  if (!session) return redirect("/login");
  const sp = searchParams ? await (searchParams as any) : {};
  const projectId = sp.projectId && sp.projectId !== "" ? sp.projectId : "";
  const q = sp.q && sp.q !== "" ? sp.q : "";
  const statusFilter = sp.status && sp.status !== "" ? sp.status : "";
  const priorityFilter = sp.priority && sp.priority !== "" ? sp.priority : "";
  const mineFilter = sp.mine && sp.mine !== "" ? true : false;
  const userId = (session as any).user?.id as string | undefined;
  const projects = await prisma.project.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } });
  const tasks = await prisma.task.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(statusFilter ? { status: statusFilter as any } : {}),
      ...(priorityFilter ? { priority: priorityFilter as any } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {}),
      ...(mineFilter && userId ? { assignedToId: userId } : {}),
    },
    include: { assignedTo: true, assignedTeam: true, project: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  
  return (
    <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 lg:py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Görevler</h1>
      </div>

      <Card className="p-4">
        <form
          className="flex flex-wrap items-end gap-2"
          action={async (formData: FormData) => {
            "use server";
            const nextProjectId = String(formData.get("projectId") || "");
            const nextQ = String(formData.get("q") || "");
            const nextStatus = String(formData.get("status") || "");
            const nextPriority = String(formData.get("priority") || "");
            const nextMine = String(formData.get("mine") || "");
            const qs = new URLSearchParams();
            if (nextProjectId) qs.set("projectId", nextProjectId);
            if (nextQ) qs.set("q", nextQ);
            if (nextStatus) qs.set("status", nextStatus);
            if (nextPriority) qs.set("priority", nextPriority);
            if (nextMine) qs.set("mine", "1");
            return (await import("next/navigation")).redirect(`/tasks?${qs.toString()}`);
          }}
        >
          <div className="flex flex-col">
            <label className="text-xs text-zinc-600">Proje</label>
            <Select name="projectId" defaultValue={projectId} className="rounded border px-2 py-1 text-sm">
              <option value="">Tümü</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-zinc-600">Arama</label>
            <Input name="q" defaultValue={q} placeholder="Başlık/Açıklama" className="w-64" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-zinc-600">Durum</label>
            <Select name="status" defaultValue={statusFilter} className="rounded border px-2 py-1 text-sm">
              <option value="">Tümü</option>
              <option value="ToDo">Yapılacak</option>
              <option value="InProgress">Devam Ediyor</option>
              <option value="Waiting">Beklemede</option>
              <option value="Completed">Tamamlandı</option>
            </Select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-zinc-600">Öncelik</label>
            <Select name="priority" defaultValue={priorityFilter} className="rounded border px-2 py-1 text-sm">
              <option value="">Tümü</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="mine" name="mine" defaultChecked={mineFilter} className="h-4 w-4" />
            <label htmlFor="mine" className="text-xs text-zinc-600">Sadece bana atanmış</label>
          </div>
          <Button type="submit" variant="outline" size="sm">Göster</Button>
        </form>
      </Card>

      

      <Card className="p-2 sm:p-4 lg:p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-600">
                <th className="px-2 sm:px-4 lg:px-6 py-2">Başlık</th>
                <th className="px-2 sm:px-4 lg:px-6 py-2">Proje</th>
                <th className="px-2 sm:px-4 lg:px-6 py-2">Durum</th>
                <th className="px-2 sm:px-4 lg:px-6 py-2">Öncelik</th>
                <th className="px-2 sm:px-4 lg:px-6 py-2">Atanan</th>
                <th className="px-2 sm:px-4 lg:px-6 py-2">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, idx) => (
                <tr key={t.id} className={`border-t ${idx % 2 === 0 ? "bg-white" : "bg-neutral-50"} hover:bg-neutral-100 transition-colors`}>
                  <td className="px-2 sm:px-4 lg:px-6 py-2">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-zinc-600 line-clamp-2">{t.description}</div>
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-2">{t.project?.title}</td>
                  <td className="px-2 sm:px-4 lg:px-6 py-2">
                    <form method="post"
                      className="flex items-center gap-2"
                      action={async (formData: FormData) => {
                        "use server";
                        const s = String(formData.get("status") || "");
                        if (s) {
                          const session = await getServerSession(authConfig as any);
                          if (!session) return;
                          const roles = (session as any).roles as any[] | undefined;
                          if (!RBAC.canManageOwnProjects(roles) && !RBAC.canViewAssignedTasks(roles)) return;
                          await prisma.task.update({ where: { id: t.id }, data: { status: s as any } });
                          await prisma.activityLog.create({ data: { userId: (session as any).user?.id, taskId: t.id, projectId: t.projectId, action: "TaskUpdate", entityType: "Task" } });
                        }
                        const qs = new URLSearchParams();
                        if (projectId) qs.set("projectId", projectId);
                        if (q) qs.set("q", q);
                        if (statusFilter) qs.set("status", statusFilter);
                        if (priorityFilter) qs.set("priority", priorityFilter);
                        if (mineFilter) qs.set("mine", "1");
                        return (await import("next/navigation")).redirect(`/tasks?${qs.toString()}`);
                      }}
                    >
                      <Select name="status" defaultValue={t.status as any} className="rounded border px-2 py-1 text-xs">
                        <option value="ToDo">Yapılacak</option>
                        <option value="InProgress">Devam Ediyor</option>
                        <option value="Waiting">Beklemede</option>
                        <option value="Completed">Tamamlandı</option>
                      </Select>
                      <Button type="submit" variant="outline" size="sm" className="text-[10px] p-1">Kaydet</Button>
                    </form>
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-2">
                    <form method="post"
                      className="flex items-center gap-2"
                      action={async (formData: FormData) => {
                        "use server";
                        const p = String(formData.get("priority") || "");
                        if (p) {
                          const session = await getServerSession(authConfig as any);
                          if (!session) return;
                          const roles = (session as any).roles as any[] | undefined;
                          if (!RBAC.canManageOwnProjects(roles) && !RBAC.canViewAssignedTasks(roles)) return;
                          await prisma.task.update({ where: { id: t.id }, data: { priority: p as any } });
                          await prisma.activityLog.create({ data: { userId: (session as any).user?.id, taskId: t.id, projectId: t.projectId, action: "TaskUpdate", entityType: "Task" } });
                        }
                        const qs = new URLSearchParams();
                        if (projectId) qs.set("projectId", projectId);
                        if (q) qs.set("q", q);
                        if (statusFilter) qs.set("status", statusFilter);
                        if (priorityFilter) qs.set("priority", priorityFilter);
                        if (mineFilter) qs.set("mine", "1");
                        return (await import("next/navigation")).redirect(`/tasks?${qs.toString()}`);
                      }}
                    >
                      <Select name="priority" defaultValue={t.priority as any} className="rounded border px-2 py-1 text-xs">
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </Select>
                      <Button type="submit" variant="outline" size="sm" className="text-[10px] p-1">Kaydet</Button>
                    </form>
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-2">
                    <div className="flex flex-wrap gap-1">
                      {t.assignedTo ? (
                        <Badge className="bg-neutral-50 border-neutral-200 text-zinc-700">Kişi: {t.assignedTo.name ?? t.assignedTo.email}</Badge>
                      ) : null}
                      {t.assignedTeam ? (
                        <Badge className="bg-neutral-50 border-neutral-200 text-zinc-700">Takım: {t.assignedTeam.name}</Badge>
                      ) : null}
                      {!t.assignedTo && !t.assignedTeam ? (
                        <span className="text-xs text-zinc-500">Atama yok</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-2">
                    <div className="flex items-center gap-1">
                      <Link href={`/tasks/${t.id}`}>
                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Detay">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <form
                        action={async () => {
                          "use server";
                          const session = await getServerSession(authConfig as any);
                          if (!session) return;
                          const roles = (session as any).roles as any[] | undefined;
                          if (!RBAC.canManageOwnProjects(roles)) return;
                          await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: t.projectId, action: "TaskDelete", entityType: "Task", metadata: { deletedTaskId: t.id } } });
                          await prisma.attachment.deleteMany({ where: { taskId: t.id } });
                          await prisma.taskComment.deleteMany({ where: { taskId: t.id } });
                          await prisma.taskAssignee.deleteMany({ where: { taskId: t.id } });
                          await prisma.subtask.deleteMany({ where: { taskId: t.id } });
                          await prisma.task.delete({ where: { id: t.id } });
                          const qs = new URLSearchParams();
                          if (projectId) qs.set("projectId", projectId);
                          if (q) qs.set("q", q);
                          if (statusFilter) qs.set("status", statusFilter);
                          if (priorityFilter) qs.set("priority", priorityFilter);
                          if (mineFilter) qs.set("mine", "1");
                          return (await import("next/navigation")).redirect(`/tasks?${qs.toString()}`);
                        }}
                      >
                        <Button type="submit" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" aria-label="Sil">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-2 text-sm text-zinc-600">Görev bulunamadı</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
