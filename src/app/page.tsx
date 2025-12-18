import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskStatus, ProjectStatus, Priority } from "@prisma/client";
import QuickTaskModal from "@/components/quick-task-modal";
import KanbanBoard from "@/components/kanban-board";
import { Progress } from "@/components/ui/progress";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { FolderKanban, ListTodo, CheckCircle2, Calendar } from "lucide-react";
import DonutChart from "@/components/donut-chart";

export default async function Home({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const totalProjects = await prisma.project.count();
  const totalTasks = await prisma.task.count();
  const completedTasks = await prisma.task.count({ where: { status: TaskStatus.Completed } });
  const completedPct = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const upcoming = await prisma.task.findMany({ where: { dueDate: { gte: new Date() } }, orderBy: { dueDate: "asc" }, take: 4 });
  const pipelineGroup = await prisma.task.groupBy({ by: ["status"], _count: { _all: true } });
  const pipe: Record<TaskStatus, number> = {
    [TaskStatus.ToDo]: 0,
    [TaskStatus.InProgress]: 0,
    [TaskStatus.Waiting]: 0,
    [TaskStatus.Completed]: 0,
  } as any;
  for (const g of pipelineGroup as any[]) {
    const c = (g._count && g._count._all) || g._count || 0;
    pipe[g.status as TaskStatus] = Number(c);
  }
  const pipeTotal = Object.values(pipe).reduce((a, b) => a + b, 0) || 1;
  const now = new Date();
  const params = searchParams ? await (searchParams as any) : {};
  const q = params.q && params.q !== "" ? params.q : undefined;
  const statusParam = params.status && params.status !== "" ? params.status : undefined;
  const sort = params.sort && params.sort !== "" ? params.sort : "recent";
  const view = params.view && params.view !== "" ? params.view : "card";
  const responsibleIdParam = params.responsibleId && params.responsibleId !== "" ? params.responsibleId : undefined;
  const projectId = params.projectId && params.projectId !== "" ? params.projectId : undefined;
  const monthsParam = params.months && params.months !== "" ? parseInt(params.months) : 9;
  const monthsRange = Math.min(12, Math.max(6, isNaN(monthsParam) ? 9 : monthsParam));
  const since = new Date(now.getFullYear(), now.getMonth() - (monthsRange - 1), 1);
  const recentTasks = await prisma.task.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, status: true } });
  const months: { key: string; label: string; total: number; completed: number }[] = [];
  for (let i = monthsRange - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"][d.getMonth()];
    months.push({ key, label, total: 0, completed: 0 });
  }
  for (const t of recentTasks as any[]) {
    const d = new Date(t.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const m = months.find((x) => x.key === key);
    if (m) {
      m.total += 1;
      if (t.status === TaskStatus.Completed) m.completed += 1;
    }
  }
  const maxVal = Math.max(1, ...months.map((m) => m.total));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const topPerfGrouped = await prisma.task.groupBy({
    by: ["assignedToId"],
    where: { status: TaskStatus.Completed, updatedAt: { gte: startOfMonth, lt: endOfMonth }, assignedToId: { not: null } },
    _count: { _all: true },
  });
  const topPerformanceRanking = (topPerfGrouped as any[])
    .filter((g) => g.assignedToId)
    .map((g) => ({ assignedToId: String(g.assignedToId), count: Number((g._count && g._count._all) || g._count || 0) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  
  const [users, projects] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true, name: true }, where: { deleted: false } }),
    prisma.project.findMany({
      take: 8,
      where: {
        ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {}),
        ...(statusParam ? { status: statusParam as ProjectStatus } : {}),
        ...(responsibleIdParam ? { responsibleId: responsibleIdParam } : {}),
      },
      include: { responsible: true },
      orderBy: sort === "alpha" ? { title: "asc" } : sort === "status" ? { status: "asc" } : { updatedAt: "desc" },
    }),
  ]);

  const projectIds = projects.map((p) => p.id);
  const totalsByProject: Record<string, number> = {};
  const completedByProject: Record<string, number> = {};
  const criticalByProject: Record<string, number> = {};
  const lastActivityByProject: Record<string, { action: string; createdAt: Date; userName?: string | null; userEmail?: string | null }> = {};
  if (projectIds.length) {
    const grouped = await prisma.task.groupBy({ by: ["projectId", "status"], where: { projectId: { in: projectIds } }, _count: { _all: true } });
    for (const g of grouped as any[]) {
      const pid = String(g.projectId);
      const c = (g._count && g._count._all) || g._count || 0;
      totalsByProject[pid] = (totalsByProject[pid] || 0) + Number(c);
      if (g.status === TaskStatus.Completed) completedByProject[pid] = (completedByProject[pid] || 0) + Number(c);
    }
    const groupedPrio = await prisma.task.groupBy({ by: ["projectId", "priority"], where: { projectId: { in: projectIds } }, _count: { _all: true } });
    for (const g of groupedPrio as any[]) {
      const pid = String(g.projectId);
      const c = (g._count && g._count._all) || g._count || 0;
      if (g.priority === Priority.Critical) criticalByProject[pid] = (criticalByProject[pid] || 0) + Number(c);
    }
    const lastLogs = await prisma.activityLog.findMany({ where: { projectId: { in: projectIds } }, include: { user: true }, orderBy: { createdAt: "desc" } });
    for (const log of lastLogs as any[]) {
      const pid = String(log.projectId);
      if (!lastActivityByProject[pid]) {
        lastActivityByProject[pid] = { action: String(log.action), createdAt: new Date(log.createdAt), userName: log.user?.name ?? null, userEmail: log.user?.email ?? null };
      }
    }
  }

  const projectStatusGroup = await prisma.project.groupBy({ by: ["status"], _count: { _all: true } });
  const statusCounts: Record<ProjectStatus, number> = { [ProjectStatus.Planned]: 0, [ProjectStatus.Active]: 0, [ProjectStatus.Blocked]: 0, [ProjectStatus.Done]: 0 } as any;
  for (const g of projectStatusGroup as any[]) {
    const c = (g._count && g._count._all) || g._count || 0;
    statusCounts[g.status as ProjectStatus] = Number(c);
  }
  const donutItems = [
    { label: "Planlandı", value: statusCounts[ProjectStatus.Planned] || 0, className: "text-zinc-600" },
    { label: "Aktif", value: statusCounts[ProjectStatus.Active] || 0, className: "text-blue-600" },
    { label: "Bloklu", value: statusCounts[ProjectStatus.Blocked] || 0, className: "text-red-600" },
    { label: "Tamamlandı", value: statusCounts[ProjectStatus.Done] || 0, className: "text-green-600" },
  ];
  const donutTotal = donutItems.reduce((a, b) => a + b.value, 0);
  const centerLabel = `${donutTotal}`;
  const recentLogsGlobal = await prisma.activityLog.findMany({ take: 5, include: { user: true, project: true }, orderBy: { createdAt: "desc" } });

  return (
    <div className="px-2 sm:px-4 lg:px-6 py-0">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Ana Sayfa</h1>
        <div className="flex items-center gap-2"></div>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="transition duration-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">Toplam Proje</div>
            <FolderKanban className="h-5 w-5 text-neutral-600" />
          </div>
          <div className="mt-1 text-2xl font-semibold">{totalProjects}</div>
        </Card>
        <Card className="transition duration-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">Toplam Görev</div>
            <ListTodo className="h-5 w-5 text-neutral-600" />
          </div>
          <div className="mt-1 text-2xl font-semibold">{totalTasks}</div>
        </Card>
        <Card className="transition duration-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">Tamamlanan Görev %</div>
            <CheckCircle2 className="h-5 w-5 text-neutral-600" />
          </div>
          <div className="mt-1 text-2xl font-semibold">{completedPct}%</div>
        </Card>
        <Card className="transition duration-200">
          <CardHeader>
            <CardTitle>Tamamlanma oranı</CardTitle>
          </CardHeader>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span>Toplam</span>
              <span>{completedTasks} / {totalTasks}</span>
            </div>
            <div className="mt-2">
              <Progress value={totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0} />
            </div>
          </div>
        </Card>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 transition duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold"><ListTodo className="h-5 w-5 text-neutral-600" /> Görevler</CardTitle>
            <QuickTaskModal projects={projects.map((p) => ({ id: p.id, title: p.title }))} />
          </CardHeader>
          <div>
            {upcoming.length === 0 ? (
              <div className="text-sm text-zinc-500">Yaklaşan görev yok</div>
            ) : (
              <table className="w-full table-fixed">
                <thead>
                  <tr className="text-xs text-zinc-500">
                    <th className="w-8 text-left"></th>
                    <th className="text-left">Görev</th>
                    <th className="w-28 text-left">Öncelik</th>
                    <th className="w-40 text-left">Son Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {upcoming.map((t) => (
                    <tr key={t.id} className="hover:bg-neutral-50">
                      <td className="py-2"><ListTodo className="h-4 w-4 text-neutral-600" /></td>
                      <td className="py-2">
                        <Link href={`/tasks/${t.id}`} className="text-sm hover:underline">{t.title}</Link>
                      </td>
                      <td className="py-2">
                        <Badge className={t.priority === "Critical" ? "bg-red-600 border-red-700 text-white" : t.priority === "High" ? "bg-orange-500 border-orange-600 text-white" : t.priority === "Medium" ? "bg-blue-600 border-blue-700 text-white" : "bg-zinc-700 border-zinc-800 text-white"}>{t.priority}</Badge>
                      </td>
                      <td className="py-2 text-xs text-zinc-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{t.dueDate ? new Date(t.dueDate).toLocaleString() : ""}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
        <Card className="transition duration-200">
          <CardHeader>
            <CardTitle>Durum Özeti</CardTitle>
          </CardHeader>
          <TooltipProvider delayDuration={100}>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm"><span>Yapılacak</span><span>{pipe[TaskStatus.ToDo]}</span></div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-1"><Progress value={Math.round((pipe[TaskStatus.ToDo] / pipeTotal) * 100)} barClassName="bg-zinc-600" /></div>
                </TooltipTrigger>
                <TooltipContent>{Math.round((pipe[TaskStatus.ToDo] / pipeTotal) * 100)}%</TooltipContent>
              </Tooltip>
              <div className="flex items-center justify-between text-sm"><span>Devam Ediyor</span><span>{pipe[TaskStatus.InProgress]}</span></div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-1"><Progress value={Math.round((pipe[TaskStatus.InProgress] / pipeTotal) * 100)} barClassName="bg-indigo-600" /></div>
                </TooltipTrigger>
                <TooltipContent>{Math.round((pipe[TaskStatus.InProgress] / pipeTotal) * 100)}%</TooltipContent>
              </Tooltip>
              <div className="flex items-center justify-between text-sm"><span>Beklemede</span><span>{pipe[TaskStatus.Waiting]}</span></div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-1"><Progress value={Math.round((pipe[TaskStatus.Waiting] / pipeTotal) * 100)} barClassName="bg-amber-500" /></div>
                </TooltipTrigger>
                <TooltipContent>{Math.round((pipe[TaskStatus.Waiting] / pipeTotal) * 100)}%</TooltipContent>
              </Tooltip>
              <div className="flex items-center justify-between text-sm"><span>Tamamlandı</span><span>{pipe[TaskStatus.Completed]}</span></div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-1"><Progress value={Math.round((pipe[TaskStatus.Completed] / pipeTotal) * 100)} barClassName="bg-green-600" /></div>
                </TooltipTrigger>
                <TooltipContent>{Math.round((pipe[TaskStatus.Completed] / pipeTotal) * 100)}%</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </Card>
        <Card className="transition duration-200">
          <CardHeader>
            <CardTitle>Grafikler ve Analiz</CardTitle>
          </CardHeader>
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-600">
              <span>Son {monthsRange} ay</span>
              <span>Toplam / Tamamlanan</span>
            </div>
            <div className="mt-2 flex items-center justify-end">
              <form
                className="flex items-center gap-2"
                action={async (formData: FormData) => {
                  "use server";
                  const qs = new URLSearchParams();
                  const months = String(formData.get("months") || "");
                  if (q) qs.set("q", q);
                  if (statusParam) qs.set("status", statusParam);
                  if (sort) qs.set("sort", sort);
                  if (view) qs.set("view", view);
                  if (responsibleIdParam) qs.set("responsibleId", responsibleIdParam);
                  if (projectId) qs.set("projectId", projectId);
                  if (months) qs.set("months", months);
                  const url = `/?${qs.toString()}`;
                  return (await import("next/navigation")).redirect(url);
                }}
              >
                <select name="months" defaultValue={String(monthsRange)} className="rounded-md border px-2 py-1 text-xs">
                  <option value="6">6</option>
                  <option value="9">9</option>
                  <option value="12">12</option>
                </select>
                <Button type="submit" variant="outline" size="sm" className="text-[10px] px-2">Uygula</Button>
              </form>
            </div>
            <TooltipProvider delayDuration={100}>
              <div className={monthsRange === 6 ? "mt-2 grid grid-cols-6 gap-2" : monthsRange === 9 ? "mt-2 grid grid-cols-9 gap-2" : "mt-2 grid grid-cols-12 gap-2"}>
                {months.map((m) => (
                  <div key={m.key} className="flex flex-col items-center justify-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative w-6 h-32 rounded bg-neutral-100">
                          <div style={{ height: `${Math.round((m.total / maxVal) * 100)}%` }} className="absolute bottom-0 left-0 right-0 rounded bg-neutral-300" />
                          <div style={{ height: `${Math.round((m.completed / maxVal) * 100)}%` }} className="absolute bottom-0 left-0 right-0 rounded bg-[var(--primary)]" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{m.label}: Toplam {m.total} • Tamamlanan {m.completed}</TooltipContent>
                    </Tooltip>
                    <div className="mt-1 text-[10px] text-zinc-600">{m.label}</div>
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </Card>
        <Card className="transition duration-200">
          <CardHeader>
            <CardTitle>Top Performance</CardTitle>
          </CardHeader>
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-600">
              <span>Bu Ay</span>
              <span>{new Date().toLocaleString("tr-TR", { month: "long", year: "numeric" })}</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {topPerformanceRanking.map((r, idx) => {
                const info = users.find((u) => u.id === r.assignedToId);
                const name = info?.name ?? info?.email ?? "-";
                const place = ["1.", "2.", "3.", "4."][idx];
                return (
                  <div key={r.assignedToId} className="flex flex-col items-center rounded-md border px-2 py-3">
                    <span className="inline-block h-12 w-12 rounded-full bg-neutral-200" />
                    <div className="mt-1 text-sm truncate max-w-[9rem] text-center">{name}</div>
                    <div className="text-xs text-zinc-500">{place} • {r.count}</div>
                  </div>
                );
              })}
              {topPerformanceRanking.length === 0 ? (
                <div className="col-span-4 text-xs text-zinc-500">Bu ay tamamlanan görev ataması bulunamadı.</div>
              ) : null}
            </div>
          </div>
        </Card>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 transition duration-200">
          <CardHeader>
            <CardTitle>Aktif Proje Durumu</CardTitle>
          </CardHeader>
          <div>
            <DonutChart items={donutItems} centerLabel={centerLabel} />
          </div>
        </Card>
        <Card className="transition duration-200">
          <CardHeader>
            <CardTitle>Bildirimler</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {recentLogsGlobal.map((log) => (
              <div key={String(log.id)} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />
                  <span className="truncate">{log.project?.title ?? "-"} • {String(log.action)}</span>
                </div>
                <div className="text-[11px] text-zinc-500 shrink-0">{new Date(log.createdAt as any).toLocaleString()}</div>
              </div>
            ))}
            {recentLogsGlobal.length === 0 ? <div className="text-xs text-zinc-500">Bildirim yok</div> : null}
          </div>
        </Card>
      </div>
      <Card className="transition duration-200">
        <CardHeader>
          <CardTitle>Projeler</CardTitle>
        </CardHeader>
        <form
          className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-6"
          action={async (formData: FormData) => {
            "use server";
            const qs = new URLSearchParams();
            const query = String(formData.get("q") || "");
            const status = String(formData.get("status") || "");
            const sort = String(formData.get("sort") || "");
            const view = String(formData.get("view") || "");
            const responsibleId = String(formData.get("responsibleId") || "");
            if (query) qs.set("q", query);
            if (status) qs.set("status", status);
            if (sort) qs.set("sort", sort);
            if (view) qs.set("view", view);
            if (responsibleId) qs.set("responsibleId", responsibleId);
            const url = `/?${qs.toString()}`;
            return (await import("next/navigation")).redirect(url);
          }}
        >
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Ara</label>
            <Input name="q" defaultValue={q ?? ""} placeholder="Başlık veya açıklama" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Durum</label>
            <select name="status" defaultValue={statusParam ?? ""} className="w-full rounded border px-3 py-2 text-sm">
              <option value="">Tümü</option>
              <option value="Planned">Planlandı</option>
              <option value="Active">Aktif</option>
              <option value="Blocked">Bloklu</option>
              <option value="Done">Tamamlandı</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Sırala</label>
            <select name="sort" defaultValue={sort ?? "recent"} className="w-full rounded border px-3 py-2 text-sm">
              <option value="recent">Güncellenme (yakın)</option>
              <option value="alpha">Alfabetik</option>
              <option value="status">Durum</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Görünüm</label>
            <select name="view" defaultValue={view ?? "card"} className="w-full rounded border px-3 py-2 text-sm">
              <option value="card">Kart</option>
              <option value="list">Liste</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Sorumlu</label>
            <select name="responsibleId" defaultValue={responsibleIdParam ?? ""} className="w-full rounded border px-3 py-2 text-sm">
              <option value="">Tümü</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="outline" size="sm">Uygula</Button>
          </div>
        </form>
        {view === "card" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
            {projects.map((p) => (
              <div key={p.id} className="block group">
                <div className={"rounded-xl border border-[var(--border)] bg-white p-4 transition duration-200 " + (p.status === "Done" ? "border-green-300" : p.status === "Blocked" ? "border-red-300" : p.status === "Active" ? "border-indigo-300" : "border-zinc-300")}>
                  <div className={`flex items-start justify-between rounded-md px-3 py-2 ${p.status === "Done" ? "bg-green-50" : p.status === "Blocked" ? "bg-red-50" : p.status === "Active" ? "bg-indigo-50" : "bg-zinc-50"}`}>
                    <div className="min-w-0">
                      <Link href={`/projects/${p.id}`} className="font-medium hover:underline truncate">{p.title}</Link>
                      <div className="mt-1 text-sm text-zinc-600 line-clamp-2">{p.description}</div>
                      <div className="mt-1 text-xs text-zinc-600">Sorumlu: {p.responsible ? (p.responsible.name ?? p.responsible.email) : "-"}</div>
                    </div>
                    <Badge className={p.status === "Done" ? "bg-green-600 border-green-700 text-white" : p.status === "Blocked" ? "bg-red-600 border-red-700 text-white" : p.status === "Active" ? "bg-indigo-600 border-indigo-700 text-white" : "bg-zinc-700 border-zinc-800 text-white"}>{p.status === "Done" ? "Tamamlandı" : p.status === "Blocked" ? "Bloklu" : p.status === "Active" ? "Aktif" : "Planlandı"}</Badge>
                  </div>
                  <div className="mt-3">
                    {(() => {
                      const total = totalsByProject[p.id] || 0;
                      const comp = completedByProject[p.id] || 0;
                      const pct = total ? Math.round((comp / total) * 100) : 0;
                      return (
                        <div>
                          <Progress value={pct} barClassName={p.status === "Done" ? "bg-green-600" : p.status === "Blocked" ? "bg-red-600" : p.status === "Active" ? "bg-indigo-600" : "bg-zinc-600"} />
                          <div className="mt-1 flex items-center justify-between text-xs text-zinc-600">
                            <span>Tamamlanan</span>
                            <span>{comp} / {total} ({pct}%)</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-zinc-600">
                    <span>Güncelleme: {new Date(p.updatedAt).toLocaleDateString()}</span>
                    <Link href={`/?projectId=${p.id}&priority=Critical#kanban`} className="hover:underline">Kritik: {criticalByProject[p.id] || 0}</Link>
                  </div>
                  <div className="mt-1 text-xs text-zinc-600">
                    {(() => {
                      const last = lastActivityByProject[p.id];
                      return last ? `Son aktivite: ${last.action} • ${new Date(last.createdAt).toLocaleString()}${last.userName || last.userEmail ? ` • ${last.userName ?? last.userEmail}` : ""}` : "Son aktivite: -";
                    })()}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Link href={`/projects/${p.id}`} className="rounded border px-2 py-1 text-xs">Detay</Link>
                    <Link href={`/projects/${p.id}#overview`} className="rounded border px-2 py-1 text-xs">Görevler</Link>
                    <Link href={`/?projectId=${p.id}#kanban`} className="rounded border px-2 py-1 text-xs">Kanban</Link>
                  </div>
                </div>
              </div>
            ))}
            {projects.length === 0 ? <div className="px-4 py-2 text-sm text-zinc-500">Proje bulunamadı</div> : null}
          </div>
        ) : (
          <ul className="rounded-md border bg-white">
            {projects.map((p) => (
              <li key={p.id} className={p.status === "Done" ? "p-3 bg-green-50" : p.status === "Blocked" ? "p-3 bg-red-50" : p.status === "Active" ? "p-3 bg-indigo-50" : "p-3 bg-zinc-50"}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <Link href={`/projects/${p.id}`} className="font-medium hover:underline truncate">{p.title}</Link>
                    <div className="mt-1 text-sm text-zinc-600 line-clamp-1">{p.description}</div>
                    <div className="mt-1 text-xs text-zinc-600">Sorumlu: {p.responsible ? (p.responsible.name ?? p.responsible.email) : "-"}</div>
                    {(() => {
                      const total = totalsByProject[p.id] || 0;
                      const comp = completedByProject[p.id] || 0;
                      const pct = total ? Math.round((comp / total) * 100) : 0;
                      return (
                        <div className="mt-2">
                          <Progress value={pct} barClassName={p.status === "Done" ? "bg-green-600" : p.status === "Blocked" ? "bg-red-600" : p.status === "Active" ? "bg-indigo-600" : "bg-zinc-600"} />
                          <div className="mt-1 flex items-center justify-between text-xs text-zinc-600">
                            <span>Tamamlanan</span>
                            <span>{comp} / {total} ({pct}%)</span>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="mt-1 text-xs text-zinc-600">
                      {(() => {
                        const last = lastActivityByProject[p.id];
                        return last ? `Son aktivite: ${last.action} • ${new Date(last.createdAt).toLocaleString()}${last.userName || last.userEmail ? ` • ${last.userName ?? last.userEmail}` : ""}` : "Son aktivite: -";
                      })()}
                    </div>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <Badge className={p.status === "Done" ? "bg-green-600 border-green-700 text-white" : p.status === "Blocked" ? "bg-red-600 border-red-700 text-white" : p.status === "Active" ? "bg-indigo-600 border-indigo-700 text-white" : "bg-zinc-700 border-zinc-800 text-white"}>{p.status}</Badge>
                    <div className="mt-2 text-xs text-zinc-500"><Link href={`/?projectId=${p.id}&priority=Critical#kanban`} className="hover:underline">Kritik: {criticalByProject[p.id] || 0}</Link></div>
                    <div className="text-xs text-zinc-500">Güncelleme: {new Date(p.updatedAt).toLocaleDateString()}</div>
                    <div className="mt-2 flex gap-2 justify-end">
                      <Link href={`/projects/${p.id}`} className="rounded border px-2 py-1 text-xs">Detay</Link>
                      <Link href={`/projects/${p.id}#overview`} className="rounded border px-2 py-1 text-xs">Görevler</Link>
                      <Link href={`/?projectId=${p.id}#kanban`} className="rounded border px-2 py-1 text-xs">Kanban</Link>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {projects.length === 0 ? <li className="px-4 py-2 text-sm text-zinc-500">Proje bulunamadı</li> : null}
          </ul>
        )}
      </Card>
      <div id="kanban">
      <Card className="transition duration-200">
          <CardHeader>
          <CardTitle>Kanban</CardTitle>
        </CardHeader>
        <form
          className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3"
          action={async (formData: FormData) => {
            "use server";
            const p = String(formData.get("projectId") || "");
            const qs = new URLSearchParams();
            if (p) qs.set("projectId", p);
            const url = `/?${qs.toString()}`;
            return (await import("next/navigation")).redirect(url);
          }}
        >
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Proje</label>
            <select name="projectId" defaultValue={(projectId ?? projects[0]?.id ?? "") as string} className="w-full rounded border px-3 py-2 text-sm">
              <option value="">Seçiniz</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="outline" size="sm">Göster</Button>
          </div>
        </form>
        {(projectId ?? projects[0]?.id) ? (
          <KanbanBoard projectId={(projectId ?? projects[0]?.id) as string} />
        ) : (
          <div className="text-sm text-zinc-600">Kanban&apos;ı görmek için bir proje seçiniz.</div>
        )}
      </Card>
      </div>
    </div>
  );
}
