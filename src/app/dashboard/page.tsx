import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TaskStatus, Priority } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RBAC } from "@/lib/rbac";

export default async function DashboardPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const session = await getServerSession(authConfig as any);
  if (!session) return redirect("/login");
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const userId = (session as any).user?.id as string;
  const roles = (session as any).roles as any[] | undefined;
  const params = searchParams ?? {};
  const projectFilter = params.projectId && params.projectId !== "" ? params.projectId : undefined;
  const statusStr = params.status || undefined;
  const priorityStr = params.priority || undefined;
  const viewStr = params.view || "mine";
  const canViewAll = RBAC.canManageOwnProjects(roles) || RBAC.canManageAll(roles);
  const mineOnly = viewStr !== "all" || !canViewAll;
  const statusFilter = statusStr && Object.values(TaskStatus).includes(statusStr as TaskStatus) ? (statusStr as TaskStatus) : undefined;
  const priorityFilter = priorityStr && Object.values(Priority).includes(priorityStr as Priority) ? (priorityStr as Priority) : undefined;
  const assignedFilter: any = mineOnly ? { assignedToId: userId } : {};
  const ongoing = await prisma.task.findMany({ where: { ...assignedFilter, status: TaskStatus.InProgress, projectId: projectFilter || undefined, priority: priorityFilter || undefined }, take: 8, orderBy: { updatedAt: "desc" } });
  const todays = await prisma.task.findMany({ where: { ...assignedFilter, dueDate: { gte: start, lt: end }, projectId: projectFilter || undefined, status: statusFilter || undefined, priority: priorityFilter || undefined }, take: 8, orderBy: { dueDate: "asc" } });
  const delayedWhere: any = { ...assignedFilter, dueDate: { lt: start }, projectId: projectFilter || undefined, priority: priorityFilter || undefined };
  delayedWhere.status = statusFilter ? statusFilter : { not: TaskStatus.Completed };
  const delayed = await prisma.task.findMany({ where: delayedWhere, take: 8, orderBy: { dueDate: "asc" } });
  const projectsAll = await prisma.project.findMany({ orderBy: { title: "asc" } });
  const projects = projectFilter ? await prisma.project.findMany({ where: { id: projectFilter } }) : await prisma.project.findMany({ take: 6, orderBy: { updatedAt: "desc" } });
  const totalTasks = await prisma.task.count({ where: { ...assignedFilter, projectId: projectFilter || undefined, status: statusFilter || undefined, priority: priorityFilter || undefined } });
  const waitingCount = await prisma.task.count({ where: { ...assignedFilter, projectId: projectFilter || undefined, status: TaskStatus.Waiting, priority: priorityFilter || undefined } });
  const inProgressCount = await prisma.task.count({ where: { ...assignedFilter, projectId: projectFilter || undefined, status: TaskStatus.InProgress, priority: priorityFilter || undefined } });
  const completedCount = await prisma.task.count({ where: { ...assignedFilter, projectId: projectFilter || undefined, status: TaskStatus.Completed, priority: priorityFilter || undefined } });
  const overdueCount = await prisma.task.count({ where: { ...assignedFilter, projectId: projectFilter || undefined, status: { not: TaskStatus.Completed }, dueDate: { lt: start }, priority: priorityFilter || undefined } });
  const prioGroup = await prisma.task.groupBy({ by: ["priority"], where: { ...assignedFilter, projectId: projectFilter || undefined, status: statusFilter || undefined }, _count: { _all: true } });
  const prioDist: Record<Priority, number> = {
    [Priority.Low]: 0,
    [Priority.Medium]: 0,
    [Priority.High]: 0,
    [Priority.Critical]: 0,
  };
  for (const g of prioGroup as any[]) {
    const c = (g._count && g._count._all) || g._count || 0;
    prioDist[g.priority as Priority] = c as number;
  }
  const weekEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
  const upcomingEvents = await prisma.calendarEvent.findMany({
    where: { userId, start: { gte: start, lt: weekEnd } },
    include: { task: true },
    orderBy: { start: "asc" },
    take: 5,
  });
  const projectIds = projects.map((p) => p.id);
  const group = projectIds.length
    ? await prisma.task.groupBy({ by: ["projectId", "status"], where: { projectId: { in: projectIds } }, _count: { _all: true } })
    : [];
  const dist: Record<string, Record<TaskStatus, number>> = {} as any;
  for (const id of projectIds) dist[id] = { Waiting: 0, InProgress: 0, Completed: 0 } as any;
  for (const g of group as any[]) {
    const c = (g._count && g._count._all) || g._count || 0;
    dist[g.projectId][g.status as TaskStatus] = c as number;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <h1 className="mb-4 text-2xl font-semibold">Dashboard</h1>
      <Card className="mb-6">
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-5"
          action={async (formData: FormData) => {
            "use server";
            const session = await getServerSession(authConfig as any);
            if (!session) return redirect("/login");
            const roles = (session as any).roles as any[] | undefined;
            const canAll = RBAC.canManageOwnProjects(roles) || RBAC.canManageAll(roles);
            const projectId = String(formData.get("projectId") || "");
            const status = String(formData.get("status") || "");
            const priority = String(formData.get("priority") || "");
            const view = String(formData.get("view") || "mine");
            const qs = new URLSearchParams();
            if (projectId) qs.set("projectId", projectId);
            if (status) qs.set("status", status);
            if (priority) qs.set("priority", priority);
            if (view === "all" && canAll) qs.set("view", "all"); else qs.set("view", "mine");
            redirect(`/dashboard?${qs.toString()}`);
          }}
        >
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Proje</label>
            <select name="projectId" defaultValue={projectFilter ?? ""} className="w-full rounded border px-3 py-2 text-sm">
              <option value="">Tümü</option>
              {projectsAll.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Durum</label>
            <select name="status" defaultValue={statusFilter ?? ""} className="w-full rounded border px-3 py-2 text-sm">
              <option value="">Tümü</option>
              {Object.values(TaskStatus).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Öncelik</label>
            <select name="priority" defaultValue={priorityFilter ?? ""} className="w-full rounded border px-3 py-2 text-sm">
              <option value="">Tümü</option>
              {Object.values(Priority).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Görünüm</label>
            <select name="view" defaultValue={viewStr} className="w-full rounded border px-3 py-2 text-sm">
              <option value="mine">Bana atanan</option>
              {canViewAll ? <option value="all">Tümü</option> : null}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">Uygula</Button>
          </div>
        </form>
      </Card>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <div className="text-sm text-zinc-500">Toplam görev</div>
          <div className="text-2xl font-semibold">{totalTasks}</div>
        </Card>
        <Card>
          <div className="text-sm text-zinc-500">Bekleyen</div>
          <div className="text-2xl font-semibold">{waitingCount}</div>
        </Card>
        <Card>
          <div className="text-sm text-zinc-500">Devam eden</div>
          <div className="text-2xl font-semibold">{inProgressCount}</div>
        </Card>
        <Card>
          <div className="text-sm text-zinc-500">Tamamlanan</div>
          <div className="text-2xl font-semibold">{completedCount}</div>
        </Card>
        <Card>
          <div className="text-sm text-zinc-500">Geciken</div>
          <div className="text-2xl font-semibold">{overdueCount}</div>
        </Card>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Öncelik dağılımı</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm"><span>Critical</span><span>{prioDist[Priority.Critical]}</span></div>
              <div className="mt-1 h-2 rounded bg-neutral-100"><div className="h-2 rounded bg-red-600" style={{ width: `${totalTasks ? Math.round((prioDist[Priority.Critical] / totalTasks) * 100) : 0}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-sm"><span>High</span><span>{prioDist[Priority.High]}</span></div>
              <div className="mt-1 h-2 rounded bg-neutral-100"><div className="h-2 rounded bg-orange-500" style={{ width: `${totalTasks ? Math.round((prioDist[Priority.High] / totalTasks) * 100) : 0}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-sm"><span>Medium</span><span>{prioDist[Priority.Medium]}</span></div>
              <div className="mt-1 h-2 rounded bg-neutral-100"><div className="h-2 rounded bg-blue-500" style={{ width: `${totalTasks ? Math.round((prioDist[Priority.Medium] / totalTasks) * 100) : 0}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-sm"><span>Low</span><span>{prioDist[Priority.Low]}</span></div>
              <div className="mt-1 h-2 rounded bg-neutral-100"><div className="h-2 rounded bg-zinc-600" style={{ width: `${totalTasks ? Math.round((prioDist[Priority.Low] / totalTasks) * 100) : 0}%` }} /></div>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tamamlanma oranı</CardTitle>
          </CardHeader>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span>Toplam</span>
              <span>{completedCount} / {totalTasks}</span>
            </div>
            <div className="mt-2 h-2 rounded bg-neutral-100">
              <div className="h-2 rounded bg-green-600" style={{ width: `${totalTasks ? Math.round((completedCount / totalTasks) * 100) : 0}%` }} />
            </div>
            <div className="mt-4 border-t pt-4">
              <form
                className="space-y-2"
                action={async (formData: FormData) => {
                  "use server";
                  const session = await getServerSession(authConfig as any);
                  if (!session) return;
                  const roles = (session as any).roles as any[] | undefined;
                  if (!RBAC.canManageOwnProjects(roles) && !RBAC.canViewAssignedTasks(roles)) return;
                  const userId = (session as any).user?.id as string;
                  const projectId = String(formData.get("projectId") || "");
                  const title = String(formData.get("title") || "");
                  const priorityStr = String(formData.get("priority") || "Medium") as keyof typeof Priority;
                  const priority: Priority = Priority[priorityStr] ?? Priority.Medium;
                  const dueRaw = formData.get("dueDate");
                  const dueDate = dueRaw ? new Date(String(dueRaw)) : undefined;
                  if (!projectId || !title) return;
                  const created = await prisma.task.create({ data: { projectId, title, assignedToId: userId, priority, status: TaskStatus.ToDo, dueDate } });
                  await prisma.activityLog.create({ data: { userId, taskId: created.id, projectId: created.projectId, action: "TaskCreate", entityType: "Task" } });
                }}
              >
                <div className="text-sm font-medium">Hızlı görev oluştur</div>
                <select name="projectId" className="w-full rounded border px-3 py-2 text-sm" required>
                  <option value="">Proje seçin</option>
                  {projectsAll.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <Input name="title" placeholder="Görev başlığı" required />
                <div className="flex items-center gap-2">
                  <select name="priority" className="flex-1 rounded border px-3 py-2 text-sm" defaultValue="Medium">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                  <Input type="date" name="dueDate" className="flex-1" />
                </div>
                <Button type="submit" className="w-full">Oluştur</Button>
              </form>
            </div>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <section className="rounded border bg-white p-4">
          <h2 className="mb-2 text-lg font-medium">Devam eden işler</h2>
          <ul className="space-y-2">
            {ongoing.map((t) => (
              <li key={t.id} className="flex justify-between">
                <span>{t.title}</span>
                <span className="text-sm text-zinc-500">{t.priority}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded border bg-white p-4">
          <h2 className="mb-2 text-lg font-medium">Bugünün görevleri</h2>
          <ul className="space-y-2">
            {todays.map((t) => (
              <li key={t.id} className="flex justify-between">
                <span>{t.title}</span>
                <span className="text-sm text-zinc-500">{t.dueDate?.toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded border bg-white p-4">
          <h2 className="mb-2 text-lg font-medium">Gecikmiş işler</h2>
          <ul className="space-y-2">
            {delayed.map((t) => (
              <li key={t.id} className="flex justify-between">
                <span>{t.title}</span>
                <span className="text-sm text-red-600">{t.dueDate?.toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="mt-6 rounded border bg-white p-4">
        <h2 className="mb-2 text-lg font-medium">Projeler</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="rounded border p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.title}</span>
                <span className="text-sm text-zinc-500">{p.status}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-600">{p.description}</p>
              <div className="mt-3 flex items-center gap-2">
                <Badge className="border-amber-500 text-amber-600">Waiting {dist[p.id]?.Waiting ?? 0}</Badge>
                <Badge className="border-indigo-600 text-indigo-700">InProgress {dist[p.id]?.InProgress ?? 0}</Badge>
                <Badge className="border-green-600 text-green-700">Completed {dist[p.id]?.Completed ?? 0}</Badge>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Link href={`/projects/${p.id}`} className="text-sm underline">Detay</Link>
                <Link href={`/projects/${p.id}#kanban`} className="text-sm underline">Kanban</Link>
              </div>
            </div>
          ))}
        </div>
      </section>
      {canViewAll ? (
        <section className="mt-6 rounded border bg-white p-4">
          <h2 className="mb-2 text-lg font-medium">Takım yükü özeti</h2>
          <TeamLoad projectId={projectFilter} />
        </section>
      ) : null}
      <section className="mt-6 rounded border bg-white p-4">
        <h2 className="mb-2 text-lg font-medium">Yaklaşan etkinlikler</h2>
        <ul className="space-y-2">
          {upcomingEvents.map((ev) => (
            <li key={ev.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{ev.title}</span>
                {ev.task ? (
                  <Link href={`/tasks/${ev.taskId}`} className="text-xs underline">{ev.task.title}</Link>
                ) : null}
              </div>
              <span className="text-xs text-zinc-500">{new Date(ev.start).toLocaleString()}</span>
            </li>
          ))}
          {upcomingEvents.length === 0 ? (
            <li className="text-sm text-zinc-500">Önümüzdeki 7 gün için etkinlik yok</li>
          ) : null}
        </ul>
      </section>
      <section className="mt-6 rounded border bg-white p-4">
        <h2 className="mb-2 text-lg font-medium">Son aktiviteler</h2>
        <RecentActivity />
      </section>
    </div>
  );
}

async function RecentActivity() {
  const session = await getServerSession(authConfig as any);
  if (!session) return null;
  const logs = await prisma.activityLog.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 10 });
  return (
    <ul className="space-y-2">
      {logs.map((a: any) => (
        <li key={a.id} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">{a.action}</span>
            <span className="text-xs text-zinc-500">{a.entityType}</span>
            <span className="text-xs text-zinc-500">{a.user?.name ?? a.userId}</span>
          </div>
          <span className="text-xs text-zinc-500">{new Date(a.createdAt).toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}

async function TeamLoad({ projectId }: { projectId?: string }) {
  const session = await getServerSession(authConfig as any);
  if (!session) return null;
  const roles = (session as any).roles as any[] | undefined;
  if (!RBAC.canManageOwnProjects(roles) && !RBAC.canManageAll(roles)) return null;
  const group = await prisma.task.groupBy({ by: ["assignedToId", "status"], where: { projectId: projectId || undefined, assignedToId: { not: null } }, _count: { _all: true } });
  const userIds = Array.from(new Set(group.map((g: any) => g.assignedToId).filter(Boolean)));
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } });
  const totals: Record<string, { total: number; waiting: number; inProgress: number; completed: number }> = {};
  for (const u of userIds) totals[u] = { total: 0, waiting: 0, inProgress: 0, completed: 0 };
  for (const g of group as any[]) {
    const c = (g._count && g._count._all) || g._count || 0;
    const entry = totals[g.assignedToId];
    if (!entry) continue;
    entry.total += Number(c);
    if (g.status === TaskStatus.Waiting) entry.waiting += Number(c);
    if (g.status === TaskStatus.InProgress) entry.inProgress += Number(c);
    if (g.status === TaskStatus.Completed) entry.completed += Number(c);
  }
  const ordered = users
    .map((u) => ({ user: u, stats: totals[u.id] }))
    .filter((x) => x.stats && x.stats.total > 0)
    .sort((a, b) => b.stats.total - a.stats.total)
    .slice(0, 8);
  return (
    <div className="space-y-2">
      {ordered.map(({ user, stats }) => (
        <div key={user.id} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{user.name ?? user.email}</span>
            <Badge className="border-indigo-600 text-indigo-700">InProgress {stats.inProgress}</Badge>
            <Badge className="border-amber-500 text-amber-600">Waiting {stats.waiting}</Badge>
            <Badge className="border-green-600 text-green-700">Completed {stats.completed}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Toplam {stats.total}</span>
            <div className="h-2 w-40 rounded bg-neutral-100">
              <div className="h-2 rounded bg-green-600" style={{ width: `${stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}%` }} />
            </div>
          </div>
        </div>
      ))}
      {ordered.length === 0 ? <div className="text-sm text-zinc-500">Görüntülenecek veri yok</div> : null}
    </div>
  );
}
