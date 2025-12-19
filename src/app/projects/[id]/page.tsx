import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { RBAC } from "@/lib/rbac";
import { Tabs } from "@/components/ui/tabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import QuickTaskModal from "@/components/quick-task-modal";
import NotesPanel from "@/components/notes-panel";
import KanbanBoard from "@/components/kanban-board";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FolderKanban, ListTodo, CheckCircle2, Calendar, MoreVertical, Download, AlertTriangle, Clock, Plus, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import TaskRowActions from "@/components/task-row-actions";
import ThemeToggle from "@/components/theme-toggle";

export default async function ProjectDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  const session = await getServerSession(authConfig as any);
  if (!session) return redirect("/login");
  const { id } = await (params as any);
  const project = await (async () => {
    try {
      return await prisma.project.findUnique({ where: { id }, include: { tasks: true, responsible: true } });
    } catch {
      return null;
    }
  })();
  if (!project) return notFound();
  let users: Array<{ id: string; email: string; name: string | null }> = [];
  try {
    if (prisma.user?.findMany) {
      users = await prisma.user.findMany({ select: { id: true, email: true, name: true }, where: { deleted: false } });
    }
  } catch {}
  let teams: Array<any> = [];
  try {
    if (prisma.team?.findMany) {
      teams = await prisma.team.findMany({ include: { members: { include: { user: true } } } });
    }
  } catch {}
  const teamsForSelect = teams.map((t) => ({
    id: t.id,
    name: t.name,
    managerName: (() => {
      const lead = Array.isArray(t.members) ? t.members.find((m: any) => m.role === "Manager" || m.role === "Lead") : null;
      const nm = (lead as any)?.user?.name ?? (lead as any)?.user?.email ?? null;
      return nm || null;
    })(),
  }));
  let groups: Array<{ id: string; name: string }> = [];
  try {
    if (prisma.taskGroup?.findMany) {
      groups = await prisma.taskGroup.findMany({ where: { projectId: id }, orderBy: { name: "asc" } }) as any;
    }
  } catch {}
  const userId = (session as any).user?.id as string | undefined;
  const roles = (session as any).roles as any[] | undefined;
  const canRemove = RBAC.canManageAll(roles) || project.responsibleId === userId;
  const total = project.tasks.length;
  const done = project.tasks.filter((t) => t.status === "Completed").length;
  const completedPct = total ? Math.round((done / total) * 100) : 0;
  const sp = searchParams ? await (searchParams as any) : {};
  const q = sp.q && sp.q !== "" ? sp.q : "";
  const statusFilter = sp.status && sp.status !== "" ? sp.status : "";
  const priorityFilter = sp.priority && sp.priority !== "" ? sp.priority : "";
  const groupFilter = sp.groupId && sp.groupId !== "" ? sp.groupId : "";
  const assignedToFilter = sp.assignedToId && sp.assignedToId !== "" ? sp.assignedToId : "";
  const teamFilter = sp.assignedTeamId && sp.assignedTeamId !== "" ? sp.assignedTeamId : "";
  const managerFilter = sp.managerId && sp.managerId !== "" ? sp.managerId : "";
  const mineFilter = sp.mine && sp.mine !== "" ? true : false;
  const overdueFilter = sp.overdue && sp.overdue !== "" ? true : false;
  const upcomingLimit = sp.upLimit && !isNaN(Number(sp.upLimit)) ? Math.min(20, Math.max(1, parseInt(sp.upLimit))) : 5;
  const upcoming = project.tasks
    .filter((t) => t.dueDate && t.dueDate > new Date())
    .sort((a, b) => (a.dueDate && b.dueDate ? a.dueDate.getTime() - b.dueDate.getTime() : 0))
    .slice(0, 3);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysAhead = (d: Date) => Math.floor((new Date(d).getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
  const upcomingActive = project.tasks.filter((t) => t.dueDate && (t.dueDate as any) > now && t.status !== "Completed");
  const upcomingToday = upcomingActive
    .filter((t) => daysAhead(t.dueDate as any) === 0)
    .sort((a, b) => ((a.dueDate as any).getTime() - (b.dueDate as any).getTime()))
    .slice(0, upcomingLimit);
  const upcoming3d = upcomingActive
    .filter((t) => { const d = daysAhead(t.dueDate as any); return d > 0 && d <= 3; })
    .sort((a, b) => ((a.dueDate as any).getTime() - (b.dueDate as any).getTime()))
    .slice(0, upcomingLimit);
  const upcoming1w = upcomingActive
    .filter((t) => { const d = daysAhead(t.dueDate as any); return d > 3 && d <= 7; })
    .sort((a, b) => ((a.dueDate as any).getTime() - (b.dueDate as any).getTime()))
    .slice(0, upcomingLimit);
  const overdueCount = project.tasks.filter((t) => t.dueDate && t.dueDate < new Date() && t.status !== "Completed").length;
  const criticalCount = project.tasks.filter((t) => t.priority === "Critical").length;
  const managerTeamIds = managerFilter ? teams.filter((t) => Array.isArray(t.members) && t.members.some((m: any) => m.userId === managerFilter && (m.role === "Lead" || m.role === "Manager"))).map((t) => t.id) : [];
  let tasks: any[] = [];
  try {
  if (prisma.task?.findMany) tasks = await prisma.task.findMany({
    where: {
      projectId: id,
      ...(statusFilter ? { status: statusFilter as any } : {}),
      ...(priorityFilter ? { priority: priorityFilter as any } : {}),
      ...(groupFilter ? { taskGroupId: groupFilter } : {}),
      ...(assignedToFilter ? { assignedToId: assignedToFilter } : {}),
      ...(teamFilter ? { assignedTeamId: teamFilter } : {}),
      ...(managerFilter && managerTeamIds.length > 0 ? { assignedTeamId: { in: managerTeamIds } } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {}),
      ...(mineFilter && userId ? { assignedToId: userId } : {}),
      ...(overdueFilter ? { dueDate: { lt: new Date() } } : {}),
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  } catch {}

  const tabs = [
    {
      id: "overview",
      label: "Genel",
      content: (
        <div className="space-y-4">
          <div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="rounded-md border border-[var(--border)] bg-white">
                  <CardHeader className="px-4 pt-4">
                    <CardTitle className="text-sm font-bold">Açıklama</CardTitle>
                  </CardHeader>
                  <div className="px-4 pb-4 text-sm text-zinc-700 whitespace-pre-line">{project.description ?? "-"}</div>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-white">
                  <CardHeader className="px-4 pt-4">
                    <CardTitle className="text-sm font-bold">Kapsam</CardTitle>
                  </CardHeader>
                  <div className="px-4 pb-4 text-sm text-zinc-700">
                    {(() => {
                      const txt = project.scope?.trim();
                      const tokens = txt && txt.includes(",") ? txt.split(",").map((s) => s.trim()).filter(Boolean) : [];
                      if (tokens.length === 0) return <div className="whitespace-pre-line">{txt ?? "-"}</div>;
                      return (
                        <div className="flex flex-wrap gap-2">
                          {tokens.map((t) => (
                            <Link key={t} href={`/projects/${project.id}?q=${encodeURIComponent(t)}#overview`} className="inline-flex max-w-full">
                              <Badge className="bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200 break-all max-w-full">{t}</Badge>
                            </Link>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-md border border-neutral-200 bg-white p-3">
                  <div className="text-sm font-bold mb-2">Özet</div>
                  <div className="space-y-3 text-sm text-zinc-700">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md border border-[var(--border)] bg-white p-2">
                        <div className="text-xs text-zinc-600">Durum</div>
                        <div className="mt-1"><Badge className={project.status === "Done" ? "bg-green-600 border-green-700 text-white" : project.status === "Blocked" ? "bg-red-600 border-red-700 text-white" : project.status === "Active" ? "bg-indigo-600 border-indigo-700 text-white" : "bg-zinc-700 border-zinc-800 text-white"}>{project.status === "Done" ? "Tamamlandı" : project.status === "Blocked" ? "Bloklu" : project.status === "Active" ? "Aktif" : "Planlandı"}</Badge></div>
                      </div>
                      <div className="rounded-md border border-[var(--border)] bg-white p-2">
                        <div className="text-xs text-zinc-600">Sorumlu</div>
                        <div className="mt-1">{project.responsible?.name ?? project.responsible?.email ?? "-"}</div>
                      </div>
                      <Link href={`/projects/${project.id}#overview`} className="rounded-md border border-[var(--border)] bg-white p-2 transition hover:bg-neutral-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-zinc-600">Toplam</div>
                            <div className="mt-1 font-medium">{total}</div>
                          </div>
                          <ListTodo className="h-4 w-4 text-neutral-600" />
                        </div>
                      </Link>
                      <Link href={`/projects/${project.id}?status=Completed#overview`} className="rounded-md border border-[var(--border)] bg-white p-2 transition hover:bg-neutral-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-zinc-600">Tamamlanan</div>
                            <div className="mt-1 font-medium">{done} • %{completedPct}</div>
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-neutral-600" />
                        </div>
                      </Link>
                      <Link href={`/projects/${project.id}?priority=Critical#overview`} className="rounded-md border border-[var(--border)] bg-white p-2 transition hover:bg-neutral-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-zinc-600">Kritik</div>
                            <div className="mt-1 font-medium">{criticalCount}</div>
                          </div>
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        </div>
                      </Link>
                      <Link href={`/projects/${project.id}?overdue=1#overview`} className="rounded-md border border-[var(--border)] bg-white p-2 transition hover:bg-neutral-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-zinc-600">Geciken</div>
                            <div className="mt-1 font-medium">{overdueCount}</div>
                          </div>
                          <Clock className="h-4 w-4 text-amber-600" />
                        </div>
                      </Link>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-zinc-600">Yaklaşan Görevler</span>
                        <form
                          className="flex items-center gap-2"
                          action={async (formData: FormData) => {
                            "use server";
                            const qs = new URLSearchParams();
                            const val = String(formData.get("upLimit") || "");
                            if (q) qs.set("q", q);
                            if (statusFilter) qs.set("status", statusFilter);
                            if (priorityFilter) qs.set("priority", priorityFilter);
                            if (mineFilter) qs.set("mine", "1");
                            if (overdueFilter) qs.set("overdue", "1");
                            if (val) qs.set("upLimit", val);
                            return (await import("next/navigation")).redirect(`/projects/${id}?${qs.toString()}#overview`);
                          }}
                        >
                          <select name="upLimit" defaultValue={String(upcomingLimit)} className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs">
                            <option value="3">3</option>
                            <option value="5">5</option>
                            <option value="10">10</option>
                          </select>
                          <Button type="submit" variant="outline" size="sm" className="text-[10px] px-2">Ayarla</Button>
                        </form>
                      </div>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        <div>
                          <div className="mb-1 text-xs text-zinc-600">Bugün</div>
                          <div className="space-y-1">
                            {upcomingToday.length === 0 ? <div className="text-xs text-zinc-600">Yok</div> : upcomingToday.map((t) => (
                              <div key={t.id} className="flex items-center justify-between gap-2">
                                <Link href={`/tasks/${t.id}`} className="flex-1 min-w-0 text-sm hover:underline break-words whitespace-normal">{t.title}</Link>
                                <div className="flex items-center gap-2">
                                  <Badge className={t.status === "Completed" ? "bg-green-600 border-green-700 text-white" : t.status === "InProgress" ? "bg-indigo-600 border-indigo-700 text-white" : t.status === "Waiting" ? "bg-amber-500 border-amber-600 text-white" : "bg-zinc-700 border-zinc-800 text-white"}>{t.status === "Completed" ? "Tamamlandı" : t.status === "InProgress" ? "Devam" : t.status === "Waiting" ? "Beklemede" : "Yapılacak"}</Badge>
                                  <span className="text-xs text-zinc-500">{t.priority}</span>
                                  <span className="text-xs text-zinc-500">{t.dueDate?.toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 text-xs text-zinc-600">+3 gün</div>
                          <div className="space-y-1">
                            {upcoming3d.length === 0 ? <div className="text-xs text-zinc-600">Yok</div> : upcoming3d.map((t) => (
                              <div key={t.id} className="flex items-center justify-between gap-2">
                                <Link href={`/tasks/${t.id}`} className="flex-1 min-w-0 text-sm hover:underline break-words whitespace-normal">{t.title}</Link>
                                <div className="flex items-center gap-2">
                                  <Badge className={t.status === "Completed" ? "bg-green-600 border-green-700 text-white" : t.status === "InProgress" ? "bg-indigo-600 border-indigo-700 text-white" : t.status === "Waiting" ? "bg-amber-500 border-amber-600 text-white" : "bg-zinc-700 border-zinc-800 text-white"}>{t.status === "Completed" ? "Tamamlandı" : t.status === "InProgress" ? "Devam" : t.status === "Waiting" ? "Beklemede" : "Yapılacak"}</Badge>
                                  <span className="text-xs text-zinc-500">{t.priority}</span>
                                  <span className="text-xs text-zinc-500">{t.dueDate?.toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 text-xs text-zinc-600">+1 hafta</div>
                          <div className="space-y-1">
                            {upcoming1w.length === 0 ? <div className="text-xs text-zinc-600">Yok</div> : upcoming1w.map((t) => (
                              <div key={t.id} className="flex items-center justify-between gap-2">
                                <Link href={`/tasks/${t.id}`} className="flex-1 min-w-0 text-sm hover:underline break-words whitespace-normal">{t.title}</Link>
                                <div className="flex items-center gap-2">
                                  <Badge className={t.status === "Completed" ? "bg-green-600 border-green-700 text-white" : t.status === "InProgress" ? "bg-indigo-600 border-indigo-700 text-white" : t.status === "Waiting" ? "bg-amber-500 border-amber-600 text-white" : "bg-zinc-700 border-zinc-800 text-white"}>{t.status === "Completed" ? "Tamamlandı" : t.status === "InProgress" ? "Devam" : t.status === "Waiting" ? "Beklemede" : "Yapılacak"}</Badge>
                                  <span className="text-xs text-zinc-500">{t.priority}</span>
                                  <span className="text-xs text-zinc-500">{t.dueDate?.toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-md border border-neutral-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold">Zaman ve Kayıt</CardTitle>
                  </CardHeader>
                  <div className="px-3 pb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="rounded-md border border-[var(--border)] bg-white p-2">
                      <div className="flex items-center gap-2 text-xs text-zinc-600"><Calendar className="h-4 w-4" />Başlangıç</div>
                      <div className="text-sm">{project.startDate ? new Date(project.startDate).toLocaleString() : "-"}</div>
                    </div>
                    <div className="rounded-md border border-[var(--border)] bg-white p-2">
                      <div className="flex items-center gap-2 text-xs text-zinc-600"><Calendar className="h-4 w-4" />Bitiş</div>
                      <div className="text-sm">{project.endDate ? new Date(project.endDate).toLocaleString() : "-"}</div>
                    </div>
                    <div className="rounded-md border border-[var(--border)] bg-white p-2">
                      <div className="flex items-center gap-2 text-xs text-zinc-600"><Clock className="h-4 w-4" />Oluşturulma</div>
                      <div className="text-sm">{new Date(project.createdAt as any).toLocaleString()}</div>
                    </div>
                    <div className="rounded-md border border-[var(--border)] bg-white p-2">
                      <div className="flex items-center gap-2 text-xs text-zinc-600"><Clock className="h-4 w-4" />Güncelleme</div>
                      <div className="text-sm">{new Date(project.updatedAt as any).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Timeline projectId={project.id} />
          <Card className="bg-gradient-to-r from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800 p-3 sm:p-4">
            <CardHeader>
              <CardTitle className="font-bold">Görevler</CardTitle>
            </CardHeader>
            <TooltipProvider>
            <div className="space-y-2">
              <div className="flex items-center justify-end">
                <QuickTaskModal projectId={project.id} users={users} teams={teamsForSelect} />
              </div>
              <div className="rounded-md border border-neutral-200 bg-white p-3">
                
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-zinc-600">FAZ 1 – Mevcut Yapı Analizi</div>
                      {groups.some((g) => g.name === "FAZ 1 – MEVCUT YAPI ANALİZİ") && (
                        <Badge className="bg-green-100 border-green-200 text-green-700">Eklendi</Badge>
                      )}
                    </div>
                    <form
                      action={async () => {
                        "use server";
                        const session = await getServerSession(authConfig as any);
                        if (!session) return;
                        const roles = (session as any).roles as any[] | undefined;
                        if (!RBAC.canManageOwnProjects(roles)) return;
                        const groupName = "FAZ 1 – MEVCUT YAPI ANALİZİ";
                        const existing = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name: groupName } });
                        const group = existing ?? await prisma.taskGroup.create({ data: { projectId: project.id, name: groupName } });
                        const titles = [
                          "Mevcut Domain Controller’ların incelenmesi",
                          "Kullanıcı sayısının tespiti",
                          "OU yapısının çıkarılması",
                          "Security Group envanteri",
                          "Bilgisayar hesaplarının analizi",
                          "Bağımlı servis ve uygulamaların listelenmesi",
                          "Risk ve bağımlılık analizi",
                        ];
                        for (const title of titles) {
                          const already = await prisma.task.findFirst({ where: { projectId: project.id, title, taskGroupId: group.id } });
                          if (!already) {
                            const created = await prisma.task.create({ data: { projectId: project.id, title, status: "ToDo", priority: "Medium", taskGroupId: group.id } });
                            await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: created.id, action: "TaskCreate", entityType: "Task", metadata: { template: "FAZ1" } } });
                          }
                        }
                        await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupEnsure", entityType: "TaskGroup", metadata: { name: groupName } } });
                        return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                      }}
                    >
                      <Button type="submit" variant="outline" size="sm" className="flex items-center gap-1"><Plus className="h-4 w-4" />Ekle</Button>
                    </form>
                    {groups.some((g) => g.name === "FAZ 1 – MEVCUT YAPI ANALİZİ") && canRemove && (
                      <form
                        action={async (formData: FormData) => {
                          "use server";
                          const session = await getServerSession(authConfig as any);
                          if (!session) return;
                          const roles = (session as any).roles as any[] | undefined;
                          const canDelete = RBAC.canManageAll(roles) || project.responsibleId === (session as any).user?.id;
                          if (!canDelete) return;
                          const ok = formData.get("confirmDelete");
                          if (!ok) {
                            return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                          }
                          const groupName = "FAZ 1 – MEVCUT YAPI ANALİZİ";
                          const group = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name: groupName } });
                          if (group) {
                            const tasks = await prisma.task.findMany({ where: { projectId: project.id, taskGroupId: group.id } });
                            for (const t of tasks) {
                              await prisma.$transaction([
                                prisma.attachment.deleteMany({ where: { taskId: t.id } }),
                                prisma.taskComment.deleteMany({ where: { taskId: t.id } }),
                                prisma.taskAssignee.deleteMany({ where: { taskId: t.id } }),
                                prisma.subtask.deleteMany({ where: { taskId: t.id } }),
                                prisma.task.delete({ where: { id: t.id } }),
                              ]);
                              await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: t.id, action: "TaskDelete", entityType: "Task", metadata: { template: "FAZ1" } } });
                            }
                            await prisma.taskGroup.delete({ where: { id: group.id } });
                            await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupDelete", entityType: "TaskGroup", metadata: { name: groupName } } });
                          }
                          return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                        }}
                      >
                        <label className="flex items-center gap-2 text-xs text-zinc-600">
                          <input type="checkbox" name="confirmDelete" value="1" className="h-4 w-4" />
                          Onaylıyorum
                        </label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button type="submit" variant="ghost" size="sm" className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                          </TooltipTrigger>
                          <TooltipContent>Kaldır</TooltipContent>
                        </Tooltip>
                      </form>
                    )}
                  </div>
                </div>
              <div className="rounded-md border border-neutral-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-zinc-600">FAZ 2 – Yeni Domain Tasarımı</div>
                    {groups.some((g) => g.name === "FAZ 2 – YENİ DOMAIN TASARIMI") && (
                      <Badge className="bg-green-100 border-green-200 text-green-700">Eklendi</Badge>
                    )}
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      const session = await getServerSession(authConfig as any);
                      if (!session) return;
                      const roles = (session as any).roles as any[] | undefined;
                      if (!RBAC.canManageOwnProjects(roles)) return;
                      const groupName = "FAZ 2 – YENİ DOMAIN TASARIMI";
                      const existing = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name: groupName } });
                      const group = existing ?? await prisma.taskGroup.create({ data: { projectId: project.id, name: groupName } });
                      const titles = [
                        "Domain adı ve namespace tasarımı (buski.local)",
                        "OU mimarisinin belirlenmesi",
                        "OU mimarisi: Daire Başkanlıkları",
                        "OU mimarisi: Şube Müdürlükleri",
                        "OU mimarisi: Kullanıcı/Bilgisayar ayrımı",
                        "Naming convention belirlenmesi",
                        "Security Group tasarımı (Role-Based)",
                        "Yetkilendirme modeli (Least Privilege)",
                      ];
                      for (const title of titles) {
                        const already = await prisma.task.findFirst({ where: { projectId: project.id, title, taskGroupId: group.id } });
                        if (!already) {
                          const created = await prisma.task.create({ data: { projectId: project.id, title, status: "ToDo", priority: "Medium", taskGroupId: group.id } });
                          await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: created.id, action: "TaskCreate", entityType: "Task", metadata: { template: "FAZ2" } } });
                        }
                      }
                      await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupEnsure", entityType: "TaskGroup", metadata: { name: groupName } } });
                      return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                    }}
                  >
                    <Button type="submit" variant="outline" size="sm" className="flex items-center gap-1"><Plus className="h-4 w-4" />Ekle</Button>
                  </form>
                  {groups.some((g) => g.name === "FAZ 2 – YENİ DOMAIN TASARIMI") && canRemove && (
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const session = await getServerSession(authConfig as any);
                        if (!session) return;
                        const roles = (session as any).roles as any[] | undefined;
                        const canDelete = RBAC.canManageAll(roles) || project.responsibleId === (session as any).user?.id;
                        if (!canDelete) return;
                        const ok = formData.get("confirmDelete");
                        if (!ok) {
                          return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                        }
                        const groupName = "FAZ 2 – YENİ DOMAIN TASARIMI";
                        const group = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name: groupName } });
                        if (group) {
                          const tasks = await prisma.task.findMany({ where: { projectId: project.id, taskGroupId: group.id } });
                          for (const t of tasks) {
                            await prisma.$transaction([
                              prisma.attachment.deleteMany({ where: { taskId: t.id } }),
                              prisma.taskComment.deleteMany({ where: { taskId: t.id } }),
                              prisma.taskAssignee.deleteMany({ where: { taskId: t.id } }),
                              prisma.subtask.deleteMany({ where: { taskId: t.id } }),
                              prisma.task.delete({ where: { id: t.id } }),
                            ]);
                            await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: t.id, action: "TaskDelete", entityType: "Task", metadata: { template: "FAZ2" } } });
                          }
                          await prisma.taskGroup.delete({ where: { id: group.id } });
                          await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupDelete", entityType: "TaskGroup", metadata: { name: groupName } } });
                        }
                        return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                      }}
                    >
                      <label className="flex items-center gap-2 text-xs text-zinc-600">
                        <input type="checkbox" name="confirmDelete" value="1" className="h-4 w-4" />
                        Onaylıyorum
                      </label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="submit" variant="ghost" size="sm" className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Kaldır</TooltipContent>
                      </Tooltip>
                    </form>
                  )}
                </div>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-zinc-600">FAZ 3 – Windows Server 2019 Kurulumu</div>
                    {groups.some((g) => g.name === "FAZ 3 – WINDOWS SERVER 2019 KURULUMU") && (
                      <Badge className="bg-green-100 border-green-200 text-green-700">Eklendi</Badge>
                    )}
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      const session = await getServerSession(authConfig as any);
                      if (!session) return;
                      const roles = (session as any).roles as any[] | undefined;
                      if (!RBAC.canManageOwnProjects(roles)) return;
                      const groupName = "FAZ 3 – WINDOWS SERVER 2019 KURULUMU";
                      const existing = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name: groupName } });
                      const group = existing ?? await prisma.taskGroup.create({ data: { projectId: project.id, name: groupName } });
                      const titles = [
                        "Windows Server 2019 kurulumu",
                        "Güncelleme ve güvenlik yamaları",
                        "Domain Controller kurulumu",
                        "DNS yapılandırması",
                        "FSMO rollerinin planlanması",
                        "Yedeklilik planı",
                      ];
                      for (const title of titles) {
                        const already = await prisma.task.findFirst({ where: { projectId: project.id, title, taskGroupId: group.id } });
                        if (!already) {
                          const created = await prisma.task.create({ data: { projectId: project.id, title, status: "ToDo", priority: "Medium", taskGroupId: group.id } });
                          await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: created.id, action: "TaskCreate", entityType: "Task", metadata: { template: "FAZ3" } } });
                        }
                      }
                      await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupEnsure", entityType: "TaskGroup", metadata: { name: groupName } } });
                      return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                    }}
                  >
                    <Button type="submit" variant="outline" size="sm" className="flex items-center gap-1"><Plus className="h-4 w-4" />Ekle</Button>
                  </form>
                  {groups.some((g) => g.name === "FAZ 3 – WINDOWS SERVER 2019 KURULUMU") && canRemove && (
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const session = await getServerSession(authConfig as any);
                        if (!session) return;
                        const roles = (session as any).roles as any[] | undefined;
                        const canDelete = RBAC.canManageAll(roles) || project.responsibleId === (session as any).user?.id;
                        if (!canDelete) return;
                        const ok = formData.get("confirmDelete");
                        if (!ok) {
                          return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                        }
                        const groupName = "FAZ 3 – WINDOWS SERVER 2019 KURULUMU";
                        const group = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name: groupName } });
                        if (group) {
                          const tasks = await prisma.task.findMany({ where: { projectId: project.id, taskGroupId: group.id } });
                          for (const t of tasks) {
                            await prisma.$transaction([
                              prisma.attachment.deleteMany({ where: { taskId: t.id } }),
                              prisma.taskComment.deleteMany({ where: { taskId: t.id } }),
                              prisma.taskAssignee.deleteMany({ where: { taskId: t.id } }),
                              prisma.subtask.deleteMany({ where: { taskId: t.id } }),
                              prisma.task.delete({ where: { id: t.id } }),
                            ]);
                            await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: t.id, action: "TaskDelete", entityType: "Task", metadata: { template: "FAZ3" } } });
                          }
                          await prisma.taskGroup.delete({ where: { id: group.id } });
                          await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupDelete", entityType: "TaskGroup", metadata: { name: groupName } } });
                        }
                        return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                      }}
                    >
                      <label className="flex items-center gap-2 text-xs text-zinc-600">
                        <input type="checkbox" name="confirmDelete" value="1" className="h-4 w-4" />
                        Onaylıyorum
                      </label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="submit" variant="ghost" size="sm" className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Kaldır</TooltipContent>
                      </Tooltip>
                    </form>
                  )}
                </div>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-zinc-600">FAZ 4 – OU, Kullanıcı ve Grup Oluşturma</div>
                    {groups.some((g) => g.name === "FAZ 4 – OU, KULLANICI VE GRUP OLUŞTURMA") && (
                      <Badge className="bg-green-100 border-green-200 text-green-700">Eklendi</Badge>
                    )}
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      const session = await getServerSession(authConfig as any);
                      if (!session) return;
                      const roles = (session as any).roles as any[] | undefined;
                      if (!RBAC.canManageOwnProjects(roles)) return;
                      const groupName = "FAZ 4 – OU, KULLANICI VE GRUP OLUŞTURMA";
                      const existing = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name: groupName } });
                      const group = existing ?? await prisma.taskGroup.create({ data: { projectId: project.id, name: groupName } });
                      const titles = [
                        "OU’ların oluşturulması",
                        "Daire Başkanlıklarına göre kullanıcı hesaplarının açılması",
                        "Servis hesaplarının oluşturulması",
                        "Security Group’ların oluşturulması",
                        "Grup – kullanıcı eşleşmelerinin yapılması",
                        "Yetki testleri",
                      ];
                      for (const title of titles) {
                        const already = await prisma.task.findFirst({ where: { projectId: project.id, title, taskGroupId: group.id } });
                        if (!already) {
                          const created = await prisma.task.create({ data: { projectId: project.id, title, status: "ToDo", priority: "Medium", taskGroupId: group.id } });
                          await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: created.id, action: "TaskCreate", entityType: "Task", metadata: { template: "FAZ4" } } });
                        }
                      }
                      await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupEnsure", entityType: "TaskGroup", metadata: { name: groupName } } });
                      return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                    }}
                  >
                    <Button type="submit" variant="outline" size="sm" className="flex items-center gap-1"><Plus className="h-4 w-4" />Ekle</Button>
                  </form>
                  {groups.some((g) => g.name === "FAZ 4 – OU, KULLANICI VE GRUP OLUŞTURMA") && canRemove && (
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const session = await getServerSession(authConfig as any);
                        if (!session) return;
                        const roles = (session as any).roles as any[] | undefined;
                        const canDelete = RBAC.canManageAll(roles) || project.responsibleId === (session as any).user?.id;
                        if (!canDelete) return;
                        const ok = formData.get("confirmDelete");
                        if (!ok) {
                          return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                        }
                        const groupName = "FAZ 4 – OU, KULLANICI VE GRUP OLUŞTURMA";
                        const group = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name: groupName } });
                        if (group) {
                          const tasks = await prisma.task.findMany({ where: { projectId: project.id, taskGroupId: group.id } });
                          for (const t of tasks) {
                            await prisma.$transaction([
                              prisma.attachment.deleteMany({ where: { taskId: t.id } }),
                              prisma.taskComment.deleteMany({ where: { taskId: t.id } }),
                              prisma.taskAssignee.deleteMany({ where: { taskId: t.id } }),
                              prisma.subtask.deleteMany({ where: { taskId: t.id } }),
                              prisma.task.delete({ where: { id: t.id } }),
                            ]);
                            await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: t.id, action: "TaskDelete", entityType: "Task", metadata: { template: "FAZ4" } } });
                          }
                          await prisma.taskGroup.delete({ where: { id: group.id } });
                          await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupDelete", entityType: "TaskGroup", metadata: { name: groupName } } });
                        }
                        return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                      }}
                    >
                      <label className="flex items-center gap-2 text-xs text-zinc-600">
                        <input type="checkbox" name="confirmDelete" value="1" className="h-4 w-4" />
                        Onaylıyorum
                      </label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="submit" variant="ghost" size="sm" className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Kaldır</TooltipContent>
                      </Tooltip>
                    </form>
                  )}
                </div>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-zinc-600">FAZ 5 – Daire Başkanlığı Bazlı Geçiş</div>
                    {groups.some((g) => g.name === "FAZ 5 – DAİRE BAŞKANLIĞI BAZLI GEÇİŞ") && (
                      <Badge className="bg-green-100 border-green-200 text-green-700">Eklendi</Badge>
                    )}
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      const session = await getServerSession(authConfig as any);
                      if (!session) return;
                      const roles = (session as any).roles as any[] | undefined;
                      if (!RBAC.canManageOwnProjects(roles)) return;
                      const groupName = "FAZ 5 – DAİRE BAŞKANLIĞI BAZLI GEÇİŞ";
                      const existing = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name: groupName } });
                      const group = existing ?? await prisma.taskGroup.create({ data: { projectId: project.id, name: groupName } });
                      const titles = [
                        "Pilot daire seçimi",
                        "Pilot kullanıcı geçişi",
                        "Test senaryolarının uygulanması",
                        "Sorun ve geri bildirimlerin alınması",
                        "Daire başkanlıkları bazında planlı geçiş",
                      ];
                      for (const title of titles) {
                        const already = await prisma.task.findFirst({ where: { projectId: project.id, title, taskGroupId: group.id } });
                        if (!already) {
                          const created = await prisma.task.create({ data: { projectId: project.id, title, status: "ToDo", priority: "Medium", taskGroupId: group.id } });
                          await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: created.id, action: "TaskCreate", entityType: "Task", metadata: { template: "FAZ5" } } });
                        }
                      }
                      await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupEnsure", entityType: "TaskGroup", metadata: { name: groupName } } });
                      return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                    }}
                  >
                    <Button type="submit" variant="outline" size="sm" className="flex items-center gap-1"><Plus className="h-4 w-4" />Ekle</Button>
                  </form>
                  {groups.some((g) => g.name === "FAZ 5 – DAİRE BAŞKANLIĞI BAZLI GEÇİŞ") && canRemove && (
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const session = await getServerSession(authConfig as any);
                        if (!session) return;
                        const roles = (session as any).roles as any[] | undefined;
                        const canDelete = RBAC.canManageAll(roles) || project.responsibleId === (session as any).user?.id;
                        if (!canDelete) return;
                        const ok = formData.get("confirmDelete");
                        if (!ok) {
                          return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                        }
                        const groupName = "FAZ 5 – DAİRE BAŞKANLIĞI BAZLI GEÇİŞ";
                        const group = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name: groupName } });
                        if (group) {
                          const tasks = await prisma.task.findMany({ where: { projectId: project.id, taskGroupId: group.id } });
                          for (const t of tasks) {
                            await prisma.$transaction([
                              prisma.attachment.deleteMany({ where: { taskId: t.id } }),
                              prisma.taskComment.deleteMany({ where: { taskId: t.id } }),
                              prisma.taskAssignee.deleteMany({ where: { taskId: t.id } }),
                              prisma.subtask.deleteMany({ where: { taskId: t.id } }),
                              prisma.task.delete({ where: { id: t.id } }),
                            ]);
                            await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: t.id, action: "TaskDelete", entityType: "Task", metadata: { template: "FAZ5" } } });
                          }
                          await prisma.taskGroup.delete({ where: { id: group.id } });
                          await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupDelete", entityType: "TaskGroup", metadata: { name: groupName } } });
                        }
                        return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                      }}
                    >
                      <label className="flex items-center gap-2 text-xs text-zinc-600">
                        <input type="checkbox" name="confirmDelete" value="1" className="h-4 w-4" />
                        Onaylıyorum
                      </label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="submit" variant="ghost" size="sm" className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Kaldır</TooltipContent>
                      </Tooltip>
                    </form>
                  )}
                </div>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-zinc-600">FAZ 6 – Test, Doğrulama ve Kabul</div>
                    {groups.some((g) => g.name === "FAZ 6 – TEST, DOĞRULAMA VE KABUL") && (
                      <Badge className="bg-green-100 border-green-200 text-green-700">Eklendi</Badge>
                    )}
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      const session = await getServerSession(authConfig as any);
                      if (!session) return;
                      const roles = (session as any).roles as any[] | undefined;
                      if (!RBAC.canManageOwnProjects(roles)) return;
                      const groupName = "FAZ 6 – TEST, DOĞRULAMA VE KABUL";
                      const existing = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name: groupName } });
                      const group = existing ?? await prisma.taskGroup.create({ data: { projectId: project.id, name: groupName } });
                      const titles = [
                        "Kullanıcı login testleri",
                        "Yetki kontrolleri",
                        "DNS ve AD replikasyon kontrolleri",
                        "Performans testleri",
                        "Güvenlik kontrolleri",
                        "Kabul tutanağı hazırlanması",
                      ];
                      for (const title of titles) {
                        const already = await prisma.task.findFirst({ where: { projectId: project.id, title, taskGroupId: group.id } });
                        if (!already) {
                          const created = await prisma.task.create({ data: { projectId: project.id, title, status: "ToDo", priority: "Medium", taskGroupId: group.id } });
                          await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: created.id, action: "TaskCreate", entityType: "Task", metadata: { template: "FAZ6" } } });
                        }
                      }
                      await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupEnsure", entityType: "TaskGroup", metadata: { name: groupName } } });
                      return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                    }}
                  >
                    <Button type="submit" variant="outline" size="sm" className="flex items-center gap-1"><Plus className="h-4 w-4" />Ekle</Button>
                  </form>
                  {groups.some((g) => g.name === "FAZ 6 – TEST, DOĞRULAMA VE KABUL") && canRemove && (
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const session = await getServerSession(authConfig as any);
                        if (!session) return;
                        const roles = (session as any).roles as any[] | undefined;
                        const canDelete = RBAC.canManageAll(roles) || project.responsibleId === (session as any).user?.id;
                        if (!canDelete) return;
                        const ok = formData.get("confirmDelete");
                        if (!ok) {
                          return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                        }
                        const groupName = "FAZ 6 – TEST, DOĞRULAMA VE KABUL";
                        const group = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name: groupName } });
                        if (group) {
                          const tasks = await prisma.task.findMany({ where: { projectId: project.id, taskGroupId: group.id } });
                          for (const t of tasks) {
                            await prisma.$transaction([
                              prisma.attachment.deleteMany({ where: { taskId: t.id } }),
                              prisma.taskComment.deleteMany({ where: { taskId: t.id } }),
                              prisma.taskAssignee.deleteMany({ where: { taskId: t.id } }),
                              prisma.subtask.deleteMany({ where: { taskId: t.id } }),
                              prisma.task.delete({ where: { id: t.id } }),
                            ]);
                            await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: t.id, action: "TaskDelete", entityType: "Task", metadata: { template: "FAZ6" } } });
                          }
                          await prisma.taskGroup.delete({ where: { id: group.id } });
                          await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupDelete", entityType: "TaskGroup", metadata: { name: groupName } } });
                        }
                        return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                      }}
                    >
                      <label className="flex items-center gap-2 text-xs text-zinc-600">
                        <input type="checkbox" name="confirmDelete" value="1" className="h-4 w-4" />
                        Onaylıyorum
                      </label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="submit" variant="ghost" size="sm" className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Kaldır</TooltipContent>
                      </Tooltip>
                    </form>
                  )}
                </div>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-zinc-600">FAZ 7 – Dokümantasyon ve Devir</div>
                    {groups.some((g) => g.name === "FAZ 7 – DOKÜMANTASYON VE DEVİR") && (
                      <Badge className="bg-green-100 border-green-200 text-green-700">Eklendi</Badge>
                    )}
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      const session = await getServerSession(authConfig as any);
                      if (!session) return;
                      const roles = (session as any).roles as any[] | undefined;
                      if (!RBAC.canManageOwnProjects(roles)) return;
                      const groupName = "FAZ 7 – DOKÜMANTASYON VE DEVİR";
                      const existing = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name: groupName } });
                      const group = existing ?? await prisma.taskGroup.create({ data: { projectId: project.id, name: groupName } });
                      const titles = [
                        "AD mimari dokümanı",
                        "OU ve Group yapısı dokümantasyonu",
                        "Kullanıcı yönetim prosedürleri",
                        "Yedekleme ve geri dönüş planı",
                        "Operasyon ekibine devir",
                      ];
                      for (const title of titles) {
                        const already = await prisma.task.findFirst({ where: { projectId: project.id, title, taskGroupId: group.id } });
                        if (!already) {
                          const created = await prisma.task.create({ data: { projectId: project.id, title, status: "ToDo", priority: "Medium", taskGroupId: group.id } });
                          await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: created.id, action: "TaskCreate", entityType: "Task", metadata: { template: "FAZ7" } } });
                        }
                      }
                      await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupEnsure", entityType: "TaskGroup", metadata: { name: groupName } } });
                      return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                    }}
                  >
                    <Button type="submit" variant="outline" size="sm" className="flex items-center gap-1"><Plus className="h-4 w-4" />Ekle</Button>
                  </form>
                  {groups.some((g) => g.name === "FAZ 7 – DOKÜMANTASYON VE DEVİR") && canRemove && (
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const session = await getServerSession(authConfig as any);
                        if (!session) return;
                        const roles = (session as any).roles as any[] | undefined;
                        const canDelete = RBAC.canManageAll(roles) || project.responsibleId === (session as any).user?.id;
                        if (!canDelete) return;
                        const ok = formData.get("confirmDelete");
                        if (!ok) {
                          return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                        }
                        const groupName = "FAZ 7 – DOKÜMANTASYON VE DEVİR";
                        const group = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name: groupName } });
                        if (group) {
                          const tasks = await prisma.task.findMany({ where: { projectId: project.id, taskGroupId: group.id } });
                          for (const t of tasks) {
                            await prisma.$transaction([
                              prisma.attachment.deleteMany({ where: { taskId: t.id } }),
                              prisma.taskComment.deleteMany({ where: { taskId: t.id } }),
                              prisma.taskAssignee.deleteMany({ where: { taskId: t.id } }),
                              prisma.subtask.deleteMany({ where: { taskId: t.id } }),
                              prisma.task.delete({ where: { id: t.id } }),
                            ]);
                            await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: t.id, action: "TaskDelete", entityType: "Task", metadata: { template: "FAZ7" } } });
                          }
                          await prisma.taskGroup.delete({ where: { id: group.id } });
                          await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupDelete", entityType: "TaskGroup", metadata: { name: groupName } } });
                        }
                        return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                      }}
                    >
                      <label className="flex items-center gap-2 text-xs text-zinc-600">
                        <input type="checkbox" name="confirmDelete" value="1" className="h-4 w-4" />
                        Onaylıyorum
                      </label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="submit" variant="ghost" size="sm" className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Kaldır</TooltipContent>
                      </Tooltip>
                    </form>
                  )}
                </div>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-zinc-600">FAZ 8 – Başarı Kriterleri</div>
                  <form
                    action={async () => {
                      "use server";
                      const session = await getServerSession(authConfig as any);
                      if (!session) return;
                      const roles = (session as any).roles as any[] | undefined;
                      if (!RBAC.canManageOwnProjects(roles)) return;
                      const groupName = "FAZ 8 – BAŞARI KRİTERLERİ";
                      const existing = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name: groupName } });
                      const group = existing ?? await prisma.taskGroup.create({ data: { projectId: project.id, name: groupName } });
                      const titles = [
                        "Eski bbslocal domaininin sorunsuz kapatılması",
                        "buski.local domaininin aktif ve stabil çalışması",
                        "Kullanıcıların kesintisiz erişim sağlaması",
                        "Yetkilendirme hatalarının olmaması",
                        "Dokümantasyonun eksiksiz teslim edilmesi",
                      ];
                      for (const title of titles) {
                        const already = await prisma.task.findFirst({ where: { projectId: project.id, title, taskGroupId: group.id } });
                        if (!already) {
                          const created = await prisma.task.create({ data: { projectId: project.id, title, status: "ToDo", priority: "Medium", taskGroupId: group.id } });
                          await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: created.id, action: "TaskCreate", entityType: "Task", metadata: { template: "FAZ8" } } });
                        }
                      }
                      await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupEnsure", entityType: "TaskGroup", metadata: { name: groupName } } });
                      return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                    }}
                  >
                    <Button type="submit" variant="outline" size="sm">Ekle</Button>
                  </form>
                  {groups.some((g) => g.name === "FAZ 8 – BAŞARI KRİTERLERİ") && canRemove && (
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const session = await getServerSession(authConfig as any);
                        if (!session) return;
                        const roles = (session as any).roles as any[] | undefined;
                        const canDelete = RBAC.canManageAll(roles) || project.responsibleId === (session as any).user?.id;
                        if (!canDelete) return;
                        const ok = formData.get("confirmDelete");
                        if (!ok) {
                          return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                        }
                        const groupName = "FAZ 8 – BAŞARI KRİTERLERİ";
                        const group = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name: groupName } });
                        if (group) {
                          const tasks = await prisma.task.findMany({ where: { projectId: project.id, taskGroupId: group.id } });
                          for (const t of tasks) {
                            await prisma.$transaction([
                              prisma.attachment.deleteMany({ where: { taskId: t.id } }),
                              prisma.taskComment.deleteMany({ where: { taskId: t.id } }),
                              prisma.taskAssignee.deleteMany({ where: { taskId: t.id } }),
                              prisma.subtask.deleteMany({ where: { taskId: t.id } }),
                              prisma.task.delete({ where: { id: t.id } }),
                            ]);
                            await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: t.id, action: "TaskDelete", entityType: "Task", metadata: { template: "FAZ8" } } });
                          }
                          await prisma.taskGroup.delete({ where: { id: group.id } });
                          await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupDelete", entityType: "TaskGroup", metadata: { name: groupName } } });
                        }
                        return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                      }}
                    >
                      <label className="flex items-center gap-2 text-xs text-zinc-600">
                        <input type="checkbox" name="confirmDelete" value="1" className="h-4 w-4" />
                        Onaylıyorum
                      </label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="submit" variant="ghost" size="sm" className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Kaldır</TooltipContent>
                      </Tooltip>
                    </form>
                  )}
                </div>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-zinc-600">Tüm Fazlar (1–8)</div>
                  <form
                    action={async () => {
                      "use server";
                      const session = await getServerSession(authConfig as any);
                      if (!session) return;
                      const roles = (session as any).roles as any[] | undefined;
                      if (!RBAC.canManageOwnProjects(roles)) return;
                      const phases: Array<{ name: string; titles: string[]; meta: string }> = [
                        { name: "FAZ 1 – MEVCUT YAPI ANALİZİ", meta: "FAZ1", titles: [
                          "Mevcut Domain Controller’ların incelenmesi",
                          "Kullanıcı sayısının tespiti",
                          "OU yapısının çıkarılması",
                          "Security Group envanteri",
                          "Bilgisayar hesaplarının analizi",
                          "Bağımlı servis ve uygulamaların listelenmesi",
                          "Risk ve bağımlılık analizi",
                        ]},
                        { name: "FAZ 2 – YENİ DOMAIN TASARIMI", meta: "FAZ2", titles: [
                          "Domain adı ve namespace tasarımı (buski.local)",
                          "OU mimarisinin belirlenmesi",
                          "OU mimarisi: Daire Başkanlıkları",
                          "OU mimarisi: Şube Müdürlükleri",
                          "OU mimarisi: Kullanıcı/Bilgisayar ayrımı",
                          "Naming convention belirlenmesi",
                          "Security Group tasarımı (Role-Based)",
                          "Yetkilendirme modeli (Least Privilege)",
                        ]},
                        { name: "FAZ 3 – WINDOWS SERVER 2019 KURULUMU", meta: "FAZ3", titles: [
                          "Windows Server 2019 kurulumu",
                          "Güncelleme ve güvenlik yamaları",
                          "Domain Controller kurulumu",
                          "DNS yapılandırması",
                          "FSMO rollerinin planlanması",
                          "Yedeklilik planı",
                        ]},
                        { name: "FAZ 4 – OU, KULLANICI VE GRUP OLUŞTURMA", meta: "FAZ4", titles: [
                          "OU’ların oluşturulması",
                          "Daire Başkanlıklarına göre kullanıcı hesaplarının açılması",
                          "Servis hesaplarının oluşturulması",
                          "Security Group’ların oluşturulması",
                          "Grup – kullanıcı eşleşmelerinin yapılması",
                          "Yetki testleri",
                        ]},
                        { name: "FAZ 5 – DAİRE BAŞKANLIĞI BAZLI GEÇİŞ", meta: "FAZ5", titles: [
                          "Pilot daire seçimi",
                          "Pilot kullanıcı geçişi",
                          "Test senaryolarının uygulanması",
                          "Sorun ve geri bildirimlerin alınması",
                          "Daire başkanlıkları bazında planlı geçiş",
                        ]},
                        { name: "FAZ 6 – TEST, DOĞRULAMA VE KABUL", meta: "FAZ6", titles: [
                          "Kullanıcı login testleri",
                          "Yetki kontrolleri",
                          "DNS ve AD replikasyon kontrolleri",
                          "Performans testleri",
                          "Güvenlik kontrolleri",
                          "Kabul tutanağı hazırlanması",
                        ]},
                        { name: "FAZ 7 – DOKÜMANTASYON VE DEVİR", meta: "FAZ7", titles: [
                          "AD mimari dokümanı",
                          "OU ve Group yapısı dokümantasyonu",
                          "Kullanıcı yönetim prosedürleri",
                          "Yedekleme ve geri dönüş planı",
                          "Operasyon ekibine devir",
                        ]},
                        { name: "FAZ 8 – BAŞARI KRİTERLERİ", meta: "FAZ8", titles: [
                          "Eski bbslocal domaininin sorunsuz kapatılması",
                          "buski.local domaininin aktif ve stabil çalışması",
                          "Kullanıcıların kesintisiz erişim sağlaması",
                          "Yetkilendirme hatalarının olmaması",
                          "Dokümantasyonun eksiksiz teslim edilmesi",
                        ]},
                      ];
                      for (const ph of phases) {
                        const existingGroup = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name: ph.name } });
                        const grp = existingGroup ?? await prisma.taskGroup.create({ data: { projectId: project.id, name: ph.name } });
                        for (const title of ph.titles) {
                          const already = await prisma.task.findFirst({ where: { projectId: project.id, title, taskGroupId: grp.id } });
                          if (!already) {
                            const created = await prisma.task.create({ data: { projectId: project.id, title, status: "ToDo", priority: "Medium", taskGroupId: grp.id } });
                            await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: created.id, action: "TaskCreate", entityType: "Task", metadata: { template: ph.meta } } });
                          }
                        }
                        await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupEnsure", entityType: "TaskGroup", metadata: { name: ph.name } } });
                      }
                      return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                    }}
                  >
                    <Button type="submit" variant="default" size="sm">Tümünü Ekle</Button>
                  </form>
                  {(() => {
                    const names = [
                      "FAZ 1 – MEVCUT YAPI ANALİZİ",
                      "FAZ 2 – YENİ DOMAIN TASARIMI",
                      "FAZ 3 – WINDOWS SERVER 2019 KURULUMU",
                      "FAZ 4 – OU, KULLANICI VE GRUP OLUŞTURMA",
                      "FAZ 5 – DAİRE BAŞKANLIĞI BAZLI GEÇİŞ",
                      "FAZ 6 – TEST, DOĞRULAMA VE KABUL",
                      "FAZ 7 – DOKÜMANTASYON VE DEVİR",
                      "FAZ 8 – BAŞARI KRİTERLERİ",
                    ];
                    return names.some((n) => groups.some((g) => g.name === n));
                  })() && canRemove && (
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const session = await getServerSession(authConfig as any);
                        if (!session) return;
                        const roles = (session as any).roles as any[] | undefined;
                        const canDelete = RBAC.canManageAll(roles) || project.responsibleId === (session as any).user?.id;
                        if (!canDelete) return;
                        const ok = formData.get("confirmDelete");
                        if (!ok) {
                          return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                        }
                        const phases = [
                          "FAZ 1 – MEVCUT YAPI ANALİZİ",
                          "FAZ 2 – YENİ DOMAIN TASARIMI",
                          "FAZ 3 – WINDOWS SERVER 2019 KURULUMU",
                          "FAZ 4 – OU, KULLANICI VE GRUP OLUŞTURMA",
                          "FAZ 5 – DAİRE BAŞKANLIĞI BAZLI GEÇİŞ",
                          "FAZ 6 – TEST, DOĞRULAMA VE KABUL",
                          "FAZ 7 – DOKÜMANTASYON VE DEVİR",
                          "FAZ 8 – BAŞARI KRİTERLERİ",
                        ];
                        for (const name of phases) {
                          const group = await prisma.taskGroup.findFirst({ where: { projectId: project.id, name } });
                          if (group) {
                            const tasks = await prisma.task.findMany({ where: { projectId: project.id, taskGroupId: group.id } });
                            for (const t of tasks) {
                              await prisma.$transaction([
                                prisma.attachment.deleteMany({ where: { taskId: t.id } }),
                                prisma.taskComment.deleteMany({ where: { taskId: t.id } }),
                                prisma.taskAssignee.deleteMany({ where: { taskId: t.id } }),
                                prisma.subtask.deleteMany({ where: { taskId: t.id } }),
                                prisma.task.delete({ where: { id: t.id } }),
                              ]);
                              await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, taskId: t.id, action: "TaskDelete", entityType: "Task", metadata: { template: name } } });
                            }
                            await prisma.taskGroup.delete({ where: { id: group.id } });
                            await prisma.activityLog.create({ data: { userId: (session as any).user?.id, projectId: project.id, action: "TaskGroupDelete", entityType: "TaskGroup", metadata: { name } } });
                          }
                        }
                        return (await import("next/navigation")).redirect(`/projects/${project.id}#overview`);
                      }}
                    >
                      <label className="flex items-center gap-2 text-xs text-zinc-600">
                        <input type="checkbox" name="confirmDelete" value="1" className="h-4 w-4" />
                        Onaylıyorum
                      </label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="submit" variant="ghost" size="sm" className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Tümünü Kaldır</TooltipContent>
                      </Tooltip>
                    </form>
                  )}
                </div>
              </div>
            </div>
            <details className="mt-3 rounded-md border border-neutral-200 bg-white" open>
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-bold text-zinc-800">Filtreler</summary>
              <form
              className="px-3 pb-3 flex flex-wrap items-end gap-2"
              action={async (formData: FormData) => {
                "use server";
                const qs = new URLSearchParams();
                const _q = String(formData.get("q") || "");
                const _status = String(formData.get("status") || "");
                const _priority = String(formData.get("priority") || "");
                const _groupId = String(formData.get("groupId") || "");
                const _assignedToId = String(formData.get("assignedToId") || "");
                const _assignedTeamId = String(formData.get("assignedTeamId") || "");
                const _managerId = String(formData.get("managerId") || "");
                const _mine = formData.get("mine");
                const _overdue = formData.get("overdue");
                const _reset = formData.get("reset");
                if (_reset) {
                  return (await import("next/navigation")).redirect(`/projects/${id}#overview`);
                }
                if (_q) qs.set("q", _q);
                if (_status) qs.set("status", _status);
                if (_priority) qs.set("priority", _priority);
                if (_groupId) qs.set("groupId", _groupId);
                if (_assignedToId) qs.set("assignedToId", _assignedToId);
                if (_assignedTeamId) qs.set("assignedTeamId", _assignedTeamId);
                if (_managerId) qs.set("managerId", _managerId);
                if (_mine) qs.set("mine", "1");
                if (_overdue) qs.set("overdue", "1");
                const url = `/projects/${id}?${qs.toString()}#overview`;
                return (await import("next/navigation")).redirect(url);
              }}
            >
              <div className="sm:min-w-[220px] min-w-0 flex-1">
                <label className="mb-1 block text-xs text-zinc-500">Ara</label>
                <Input name="q" defaultValue={q} placeholder="Başlık veya açıklama" className="w-full" />
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-zinc-600 bg-neutral-50">
                  <input type="checkbox" name="mine" defaultChecked={mineFilter} className="h-4 w-4" />
                  Sadece bana atanan
                </label>
                <label className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-zinc-600 bg-neutral-50">
                  <input type="checkbox" name="overdue" defaultChecked={overdueFilter} className="h-4 w-4" />
                  Son tarihi geçen
                </label>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs text-zinc-600">Durum</label>
                <select name="status" defaultValue={statusFilter} className="w-full sm:w-40 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm">
                  <option value="">Tümü</option>
                  <option value="ToDo">Yapılacak</option>
                  <option value="InProgress">Devam Ediyor</option>
                  <option value="Waiting">Beklemede</option>
                  <option value="Completed">Tamamlandı</option>
                </select>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs text-zinc-600">Öncelik</label>
                <select name="priority" defaultValue={priorityFilter} className="w-full sm:w-40 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm">
                  <option value="">Tümü</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs text-zinc-600">Grup</label>
                <select name="groupId" defaultValue={groupFilter} className="w-full sm:w-48 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm">
                  <option value="">Tümü</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs text-zinc-600">Atanan</label>
                <select name="assignedToId" defaultValue={assignedToFilter} className="w-full sm:w-48 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm">
                  <option value="">Tümü</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs text-zinc-600">Takım</label>
                <select name="assignedTeamId" defaultValue={teamFilter} className="w-full sm:w-48 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm">
                  <option value="">Tümü</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs text-zinc-600">Yönetici</label>
                <select name="managerId" defaultValue={managerFilter} className="w-full sm:w-48 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm">
                  <option value="">Tümü</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" variant="outline" size="sm">Uygula</Button>
                <Button type="submit" name="reset" value="1" variant="ghost" size="sm">Temizle</Button>
              </div>
            </form>
            </details>
            <details className="mt-3 rounded-md border border-neutral-200 bg-white" open>
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-bold text-zinc-800">Toplu İşlemler</summary>
              <form
              className="px-3 pb-3"
              action={async (formData: FormData) => {
                "use server";
                const applyAll = formData.get("applyAll");
                let ids = formData.getAll("ids").map((x) => String(x)).filter(Boolean);
                const op = String(formData.get("op") || "");
                const qs = new URLSearchParams();
                if (q) qs.set("q", q);
                if (statusFilter) qs.set("status", statusFilter);
                if (priorityFilter) qs.set("priority", priorityFilter);
                if (applyAll) {
                  ids = tasks.map((t) => t.id);
                }
                if (ids.length === 0) {
                  return (await import("next/navigation")).redirect(`/projects/${id}?${qs.toString()}#overview`);
                }
                async function post(url: string, body: any) {
                  await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
                }
                if (op === "status") {
                  const s = String(formData.get("bulkStatus") || "");
                  if (s) await post(`/api/tasks/bulk`, { ids, status: s });
                } else if (op === "priority") {
                  const p = String(formData.get("bulkPriority") || "");
                  if (p) await post(`/api/tasks/bulk/priority`, { ids, priority: p });
                } else if (op === "assign") {
                  const assignedToId = String(formData.get("bulkAssignTo") || "");
                  await post(`/api/tasks/bulk/assign`, { ids, assignedToId: assignedToId || null });
                } else if (op === "unassign") {
                  await post(`/api/tasks/bulk/assign`, { ids, assignedToId: null, assignedTeamId: null });
                } else if (op === "due") {
                  const rawDue = String(formData.get("bulkDue") || "");
                  let dueDate = rawDue;
                  const m = rawDue.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
                  if (m) {
                    const [, dd, mm, yyyy] = m as any;
                    dueDate = `${yyyy}-${mm}-${dd}`;
                  }
                  await post(`/api/tasks/bulk/due`, { ids, dueDate });
                } else if (op === "due_clear") {
                  await post(`/api/tasks/bulk/due`, { ids, dueDate: "" });
                } else if (op === "delete") {
                  const conf = formData.get("confirmDelete");
                  if (!conf) {
                    return (await import("next/navigation")).redirect(`/projects/${id}?${qs.toString()}#overview`);
                  }
                  await post(`/api/tasks/bulk/delete`, { ids });
                } else if (op === "due_rel_today" || op === "due_rel_3d" || op === "due_rel_1w") {
                  const base = new Date();
                  const addDays = op === "due_rel_today" ? 0 : op === "due_rel_3d" ? 3 : 7;
                  base.setDate(base.getDate() + addDays);
                  const pad = (n: number) => String(n).padStart(2, "0");
                  const dateStr = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
                  await post(`/api/tasks/bulk/due`, { ids, dueDate: dateStr });
                }
                return (await import("next/navigation")).redirect(`/projects/${id}?${qs.toString()}#overview`);
              }}
            >
              <div className="rounded-md border border-neutral-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-600">İşlem</label>
                    <select name="op" className="w-full sm:w-48 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs">
                      <option value="status">Durum</option>
                      <option value="priority">Öncelik</option>
                      <option value="assign">Atama</option>
                      <option value="unassign">Atamayı kaldır</option>
                      <option value="due">Son tarih ayarla</option>
                      <option value="due_clear">Son tarih kaldır</option>
                      <option value="due_rel_today">Son tarih bugün</option>
                      <option value="due_rel_3d">Son tarih +3 gün</option>
                      <option value="due_rel_1w">Son tarih +1 hafta</option>
                      <option value="delete">Sil</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-600">Durum</label>
                    <select name="bulkStatus" className="w-full sm:w-40 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs">
                      <option value="">Seçiniz</option>
                      <option value="ToDo">Yapılacak</option>
                      <option value="InProgress">Devam Ediyor</option>
                      <option value="Waiting">Beklemede</option>
                      <option value="Completed">Tamamlandı</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-600">Öncelik</label>
                    <select name="bulkPriority" className="w-full sm:w-40 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs">
                      <option value="">Seçiniz</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-600">Atama</label>
                    <select name="bulkAssignTo" className="w-full sm:w-48 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs">
                      <option value="">Yok</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-600">Son tarih</label>
                    <input type="text" name="bulkDue" placeholder="gg.aa.yyyy" className="w-full sm:w-40 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs" />
                  </div>
                  <label className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-zinc-600 bg-neutral-50">
                    <input type="checkbox" name="applyAll" className="h-4 w-4" />
                    Listelenen tüm görevlerde uygula
                  </label>
                  <label className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-red-600 bg-red-50">
                    <input type="checkbox" name="confirmDelete" className="h-4 w-4" />
                    Silmeyi onaylıyorum
                  </label>
                  <Button type="submit" variant="outline" size="sm" className="text-xs">Uygula</Button>
                </div>
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-zinc-500">
                      <th className="px-3 py-2 w-8"></th>
                      <th className="px-3 py-2">Görev</th>
                      <th className="px-3 py-2">Grup</th>
                      <th className="px-3 py-2">Durum</th>
                      <th className="px-3 py-2">Öncelik</th>
                      <th className="px-3 py-2">Atanan</th>
                      <th className="px-3 py-2">Son tarih</th>
                      <th className="px-3 py-2 w-20">Aksiyon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => {
                      const assignedLabel = users.find((u) => u.id === (t.assignedToId as any))?.name ?? users.find((u) => u.id === (t.assignedToId as any))?.email ?? "Atanmadı";
                      const teamLabel = teams.find((tm) => tm.id === (t.assignedTeamId as any))?.name ?? null;
                      const managerLabel = (() => { const tm = teams.find((x) => x.id === (t.assignedTeamId as any)); const lead = tm?.members?.find((m: any) => m.role === "Lead" || m.role === "Manager"); return lead ? (lead.user?.name ?? lead.user?.email ?? null) : null; })();
                      const dueLabel = t.dueDate ? new Date(t.dueDate as any).toLocaleDateString() : "-";
                      return (
                        <tr key={t.id} className="border-t">
                          <td className="px-3 py-2 align-middle"><input type="checkbox" name="ids" value={t.id} /></td>
                          <td className="px-3 py-2 align-middle min-w-0"><Link href={`/tasks/${t.id}`} className="text-sm hover:underline break-words whitespace-normal">{t.title}</Link></td>
                          <td className="px-3 py-2 align-middle text-xs text-zinc-600 break-words whitespace-normal">{(t as any).taskGroup?.name ?? "-"}</td>
                          <td className="px-3 py-2 align-middle">
                            <Badge className={t.status === "Completed" ? "bg-green-600 border-green-700 text-white" : t.status === "InProgress" ? "bg-indigo-600 border-indigo-700 text-white" : t.status === "Waiting" ? "bg-amber-500 border-amber-600 text-white" : "bg-zinc-700 border-zinc-800 text-white"}>{t.status === "Completed" ? "Tamamlandı" : t.status === "InProgress" ? "Devam Ediyor" : t.status === "Waiting" ? "Beklemede" : "Yapılacak"}</Badge>
                          </td>
                          <td className="px-3 py-2 align-middle">{t.priority}</td>
                          <td className="px-3 py-2 align-middle">
                            <div className="flex flex-wrap gap-1">
                              {t.assignedToId ? <Badge className="bg-neutral-50 border-neutral-200 text-zinc-700">Kişi: {assignedLabel}</Badge> : null}
                              {teamLabel ? <Badge className="bg-neutral-50 border-neutral-200 text-zinc-700">Takım: {teamLabel}</Badge> : null}
                              {teamLabel && managerLabel ? <Badge className="bg-neutral-50 border-neutral-200 text-zinc-700">Yönetici: {managerLabel}</Badge> : null}
                              {!t.assignedToId && !teamLabel ? <span className="text-xs text-zinc-500">Atama yok</span> : null}
                            </div>
                          </td>
                          <td className="px-3 py-2 align-middle">{dueLabel}</td>
                          <td className="px-3 py-2 align-middle">
                            <TaskRowActions task={{ id: t.id, status: t.status as any, priority: t.priority as any, assignedToId: t.assignedToId as any, dueDate: t.dueDate as any }} users={users} />
                          </td>
                        </tr>
                      );
                    })}
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-2 text-sm text-zinc-600">Görev bulunamadı</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </form>
            </details>
            </TooltipProvider>
          </Card>
        </div>
      ),
    },
    {
      id: "notes",
      label: "Notlar",
      content: <NotesPanel projectId={project.id} />,
    },
    {
      id: "kanban",
      label: "Kanban",
      content: <KanbanBoard projectId={project.id} />,
    },
    {
      id: "timeline",
      label: "Timeline",
      content: <Timeline projectId={project.id} />,
    },
    {
      id: "domain",
      label: "Domain Migration",
      content: <DomainMigrationTab projectId={project.id} project={project} />,
    },
    {
      id: "exchange",
      label: "Exchange Migration",
      content: <ExchangeMigrationTab projectId={project.id} project={project} />,
    },
  ];

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="sticky top-0 z-10 px-2 sm:px-4 lg:px-6 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-[var(--border)] dark:bg-neutral-900/95 dark:supports-[backdrop-filter]:bg-neutral-900/80 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between py-2 gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold break-words whitespace-normal">{project.title}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge className={project.status === "Done" ? "bg-green-600 border-green-700 text-white" : project.status === "Blocked" ? "bg-red-600 border-red-700 text-white" : project.status === "Active" ? "bg-indigo-600 border-indigo-700 text-white" : "bg-zinc-700 border-zinc-800 text-white"}>{project.status === "Done" ? "Tamamlandı" : project.status === "Blocked" ? "Bloklu" : project.status === "Active" ? "Aktif" : "Planlandı"}</Badge>
              <span className="text-sm text-zinc-600">Toplam {total} • Tamamlanan {done} • %{completedPct}</span>
            </div>
            <div className="mt-2 max-w-2xl"><Progress value={completedPct} /></div>
          </div>
          <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2 flex-wrap justify-end">
            <QuickTaskModal projectId={project.id} users={users} teams={teams} label="Görev Ekle" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1"><MoreVertical className="h-4 w-4" />İşlemler</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href={`/api/export/tasks?projectId=${project.id}&view=all`} className="flex items-center gap-2"><Download className="h-4 w-4" />CSV (Tümü)</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/projects/${project.id}#kanban`} className="flex items-center gap-2"><FolderKanban className="h-4 w-4" />Kanban’a git</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/projects/${project.id}#overview`} className="flex items-center gap-2">Görevler</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="transition duration-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">Toplam Görev</div>
            <ListTodo className="h-5 w-5 text-neutral-600" />
          </div>
          <div className="mt-1 text-2xl font-semibold">{total}</div>
        </Card>
        <Card className="transition duration-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">Tamamlanan</div>
            <CheckCircle2 className="h-5 w-5 text-neutral-600" />
          </div>
          <div className="mt-1 text-2xl font-semibold">{done}</div>
          <div className="mt-2">
            <Progress value={completedPct} />
            </div>
          </Card>
        <Card className="transition duration-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">Yaklaşan</div>
            <Calendar className="h-5 w-5 text-neutral-600" />
          </div>
          <div className="mt-1 space-y-1 text-sm text-zinc-700">
              {upcoming.length === 0 ? <div>Görev yok</div> : upcoming.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <span className="break-words whitespace-normal">{t.title}</span>
                <span className="text-xs text-zinc-500">{t.dueDate?.toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="transition duration-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">Kanban</div>
            <FolderKanban className="h-5 w-5 text-neutral-600" />
          </div>
          <div className="mt-1 text-sm text-zinc-700">Durum: {project.status}</div>
          <div className="mt-2">
            <Link href={`/projects/${project.id}#kanban`} className="rounded border px-2 py-1 text-xs">Aç</Link>
          </div>
        </Card>
      </div>
      <Tabs tabs={tabs} />
    </div>
  );
}

async function Timeline({ projectId }: { projectId: string }) {
  let tasks: any[] = [];
  try {
    if (prisma.task?.findMany) {
      tasks = await prisma.task.findMany({ where: { projectId }, orderBy: { startDate: "asc" }, include: { taskGroup: true } });
    }
  } catch {}
  let projectTitle = "-";
  try {
    const p = await prisma.project.findUnique({ where: { id: projectId }, select: { title: true } });
    projectTitle = p?.title ?? "-";
  } catch {}
  let users: Array<{ id: string; email: string; name: string | null }> = [];
  try {
    if (prisma.user?.findMany) {
      users = await prisma.user.findMany({ select: { id: true, email: true, name: true }, where: { deleted: false } });
    }
  } catch {}
  const phaseOrder = [
    "FAZ 1 – MEVCUT YAPI ANALİZİ",
    "FAZ 2 – YENİ DOMAIN TASARIMI",
    "FAZ 3 – WINDOWS SERVER 2019 KURULUMU",
    "FAZ 4 – OU, KULLANICI VE GRUP OLUŞTURMA",
    "FAZ 5 – DAİRE BAŞKANLIĞI BAZLI GEÇİŞ",
    "FAZ 6 – TEST, DOĞRULAMA VE KABUL",
    "FAZ 7 – DOKÜMANTASYON VE DEVİR",
    "FAZ 8 – BAŞARI KRİTERLERİ",
  ];
  const phaseIndex = (name?: string | null) => {
    const i = phaseOrder.indexOf(name ?? "");
    return i === -1 ? 999 : i;
  };
  tasks.sort((a, b) => {
    const ia = phaseIndex((a as any).taskGroup?.name);
    const ib = phaseIndex((b as any).taskGroup?.name);
    if (ia !== ib) return ia - ib;
    const sa = a.startDate ? a.startDate.getTime() : 0;
    const sb = b.startDate ? b.startDate.getTime() : 0;
    return sa - sb;
  });
  return (
    <Card className="p-3 sm:p-4">
      <CardHeader>
        <CardTitle className="font-bold">Timeline</CardTitle>
      </CardHeader>
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500">
              <th className="px-3 py-2">Proje</th>
              <th className="px-3 py-2">Grup</th>
              <th className="px-3 py-2">Başlık</th>
              <th className="px-3 py-2">Durum</th>
              <th className="px-3 py-2">Öncelik</th>
              <th className="px-3 py-2">Atanan</th>
              <th className="px-3 py-2 w-20">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const assignedLabel = users.find((u) => u.id === (t.assignedToId as any))?.name ?? users.find((u) => u.id === (t.assignedToId as any))?.email ?? "Atanmadı";
              return (
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-2 align-middle text-xs text-zinc-600 break-words whitespace-normal">{projectTitle}</td>
                  <td className="px-3 py-2 align-middle text-xs text-zinc-600 break-words whitespace-normal">{(t as any).taskGroup?.name ?? "-"}</td>
                  <td className="px-3 py-2 align-middle min-w-0"><Link href={`/tasks/${t.id}`} className="text-sm hover:underline break-words whitespace-normal">{t.title}</Link></td>
                  <td className="px-3 py-2 align-middle">
                    <Badge className={t.status === "Completed" ? "bg-green-600 border-green-700 text-white" : t.status === "InProgress" ? "bg-indigo-600 border-indigo-700 text-white" : t.status === "Waiting" ? "bg-amber-500 border-amber-600 text-white" : "bg-zinc-700 border-zinc-800 text-white"}>{t.status === "Completed" ? "Tamamlandı" : t.status === "InProgress" ? "Devam" : t.status === "Waiting" ? "Beklemede" : "Yapılacak"}</Badge>
                  </td>
                  <td className="px-3 py-2 align-middle">{t.priority}</td>
                  <td className="px-3 py-2 align-middle text-xs text-zinc-600 break-words whitespace-normal">{assignedLabel}</td>
                  <td className="px-3 py-2 align-middle">
                    <TaskRowActions task={{ id: t.id, status: t.status as any, priority: t.priority as any, assignedToId: t.assignedToId as any, dueDate: t.dueDate as any }} users={users} />
                  </td>
                </tr>
              );
            })}
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-2 text-sm text-zinc-600">Görev bulunamadı</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DomainMigrationTab({ projectId, project }: { projectId: string; project: any }) {
  return <ProjectExtraFields projectId={projectId} fields={{
    domainNewOUPlan: project.domainNewOUPlan ?? "",
    domainUserMigration: project.domainUserMigration ?? "",
    domainGPOPlan: project.domainGPOPlan ?? "",
  }} />;
}

function ExchangeMigrationTab({ projectId, project }: { projectId: string; project: any }) {
  return <ProjectExtraFields projectId={projectId} fields={{
    exchMailboxPlan: project.exchMailboxPlan ?? "",
    exchAutodiscover: project.exchAutodiscover ?? "",
    exchDatabaseDAG: project.exchDatabaseDAG ?? "",
    exchHybridNotes: project.exchHybridNotes ?? "",
  }} />;
}

function ProjectExtraFields({ projectId, fields }: { projectId: string; fields: Record<string, string> }) {
  return (
    <Card className="p-3 sm:p-4">
      <CardHeader>
        <CardTitle>Ek Alanlar</CardTitle>
      </CardHeader>
      <form
        className="space-y-2"
        action={async (formData: FormData) => {
          "use server";
          const data: Record<string, string> = {};
          for (const [k, v] of formData.entries()) data[k] = String(v);
          await prisma.project.update({ where: { id: projectId }, data });
        }}
      >
        {Object.entries(fields).map(([key, value]) => (
          <div key={key} className="space-y-1">
            <label className="text-sm font-medium">{key}</label>
            <Textarea name={key} defaultValue={value} />
          </div>
        ))}
        <Button type="submit">Kaydet</Button>
      </form>
    </Card>
  );
}
