import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
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
import { FolderKanban, ListTodo, CheckCircle2, Calendar, User, Flag, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/theme-toggle";

export default async function ProjectDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  const session = await getServerSession(authConfig as any);
  if (!session) return redirect("/login");
  const { id } = await (params as any);
  const project = await prisma.project.findUnique({ where: { id }, include: { tasks: true } });
  if (!project) return notFound();
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true }, where: { deleted: false } });
  const teams = await prisma.team.findMany({ select: { id: true, name: true } });
  const userId = (session as any).user?.id as string | undefined;
  const total = project.tasks.length;
  const done = project.tasks.filter((t) => t.status === "Completed").length;
  const completedPct = total ? Math.round((done / total) * 100) : 0;
  const upcoming = project.tasks
    .filter((t) => t.dueDate && t.dueDate > new Date())
    .sort((a, b) => (a.dueDate && b.dueDate ? a.dueDate.getTime() - b.dueDate.getTime() : 0))
    .slice(0, 3);
  const sp = searchParams ? await (searchParams as any) : {};
  const q = sp.q && sp.q !== "" ? sp.q : "";
  const statusFilter = sp.status && sp.status !== "" ? sp.status : "";
  const priorityFilter = sp.priority && sp.priority !== "" ? sp.priority : "";
  const mineFilter = sp.mine && sp.mine !== "" ? true : false;
  const overdueFilter = sp.overdue && sp.overdue !== "" ? true : false;
  const tasks = await prisma.task.findMany({
    where: {
      projectId: id,
      ...(statusFilter ? { status: statusFilter as any } : {}),
      ...(priorityFilter ? { priority: priorityFilter as any } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {}),
      ...(mineFilter && userId ? { assignedToId: userId } : {}),
      ...(overdueFilter ? { dueDate: { lt: new Date() } } : {}),
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  const tabs = [
    {
      id: "overview",
      label: "Genel",
      content: (
        <div className="space-y-4">
          <Card className="bg-gradient-to-r from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm text-zinc-700">{project.description}</div>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-600">
                <span>Durum: {project.status}</span>
                <span>Toplam {total}</span>
                <span>Tamamlanan {done}</span>
                <span>%{completedPct}</span>
                {upcoming[0] ? <span>Yaklaşan: {upcoming[0].dueDate?.toLocaleDateString()}</span> : null}
              </div>
            </div>
          </Card>
          <Card className="bg-gradient-to-r from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800">
            <CardHeader>
              <CardTitle>Görevler</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-600">Yeni görev ekle</div>
                <QuickTaskModal projectId={project.id} users={users} teams={teams} />
              </div>
            </div>
            <form
              className="mt-3 flex flex-wrap items-end gap-2"
              action={async (formData: FormData) => {
                "use server";
                const qs = new URLSearchParams();
                const _q = String(formData.get("q") || "");
                const _status = String(formData.get("status") || "");
                const _priority = String(formData.get("priority") || "");
                const _mine = formData.get("mine");
                const _overdue = formData.get("overdue");
                const _reset = formData.get("reset");
                if (_reset) {
                  return (await import("next/navigation")).redirect(`/projects/${id}#overview`);
                }
                if (_q) qs.set("q", _q);
                if (_status) qs.set("status", _status);
                if (_priority) qs.set("priority", _priority);
                if (_mine) qs.set("mine", "1");
                if (_overdue) qs.set("overdue", "1");
                const url = `/projects/${id}?${qs.toString()}#overview`;
                return (await import("next/navigation")).redirect(url);
              }}
            >
              <div className="min-w-[220px] flex-1">
                <label className="mb-1 block text-xs text-zinc-500">Ara</label>
                <Input name="q" defaultValue={q} placeholder="Başlık veya açıklama" className="min-w-[220px] flex-1" />
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
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Durum</label>
                <select name="status" defaultValue={statusFilter} className="w-40 rounded border px-3 py-2 text-sm">
                  <option value="">Tümü</option>
                  <option value="ToDo">Yapılacak</option>
                  <option value="InProgress">Devam Ediyor</option>
                  <option value="Waiting">Beklemede</option>
                  <option value="Completed">Tamamlandı</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Öncelik</label>
                <select name="priority" defaultValue={priorityFilter} className="w-40 rounded border px-3 py-2 text-sm">
                  <option value="">Tümü</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" variant="outline" size="sm">Uygula</Button>
                <Button type="submit" name="reset" value="1" variant="ghost" size="sm">Temizle</Button>
              </div>
            </form>
            <form
              className="mt-3 space-y-2"
              action={async (formData: FormData) => {
                "use server";
                const ids = formData.getAll("ids").map((x) => String(x)).filter(Boolean);
                const op = String(formData.get("op") || "");
                const qs = new URLSearchParams();
                if (q) qs.set("q", q);
                if (statusFilter) qs.set("status", statusFilter);
                if (priorityFilter) qs.set("priority", priorityFilter);
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
                  const dueDate = String(formData.get("bulkDue") || "");
                  await post(`/api/tasks/bulk/due`, { ids, dueDate });
                } else if (op === "due_clear") {
                  await post(`/api/tasks/bulk/due`, { ids, dueDate: "" });
                } else if (op === "delete") {
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
              <div className="rounded border bg-white p-2">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-600">Durum</label>
                    <select name="bulkStatus" className="rounded border px-2 py-1 text-xs">
                      <option value="">Seçiniz</option>
                      <option value="ToDo">Yapılacak</option>
                      <option value="InProgress">Devam Ediyor</option>
                      <option value="Waiting">Beklemede</option>
                      <option value="Completed">Tamamlandı</option>
                    </select>
                    <Button type="submit" name="op" value="status" variant="outline" size="sm" className="text-xs">Uygula</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-600">Öncelik</label>
                    <select name="bulkPriority" className="rounded border px-2 py-1 text-xs">
                      <option value="">Seçiniz</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                    <Button type="submit" name="op" value="priority" variant="outline" size="sm" className="text-xs">Uygula</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-600">Atama</label>
                    <select name="bulkAssignTo" className="rounded border px-2 py-1 text-xs">
                      <option value="">Yok</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                      ))}
                    </select>
                    <Button type="submit" name="op" value="assign" variant="outline" size="sm" className="text-xs">Ata</Button>
                    <Button type="submit" name="op" value="unassign" variant="outline" size="sm" className="text-xs">Kaldır</Button>
                  </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-600">Son tarih</label>
                <input type="date" name="bulkDue" className="rounded border px-2 py-1 text-xs" />
                <Button type="submit" name="op" value="due" variant="outline" size="sm" className="text-xs">Ayarla</Button>
                <Button type="submit" name="op" value="due_clear" variant="outline" size="sm" className="text-xs">Kaldır</Button>
                <Button type="submit" name="op" value="due_rel_today" variant="outline" size="sm" className="text-xs">Bugün</Button>
                <Button type="submit" name="op" value="due_rel_3d" variant="outline" size="sm" className="text-xs">+3 gün</Button>
                <Button type="submit" name="op" value="due_rel_1w" variant="outline" size="sm" className="text-xs">+1 hafta</Button>
              </div>
                  <div className="flex items-center gap-2">
                    <Button type="submit" name="op" value="delete" variant="destructive" size="sm" className="text-xs">Sil</Button>
                  </div>
                </div>
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-zinc-500">
                      <th className="px-3 py-2 w-8"></th>
                      <th className="px-3 py-2">Görev</th>
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
                      const dueLabel = t.dueDate ? new Date(t.dueDate as any).toLocaleDateString() : "-";
                      return (
                        <tr key={t.id} className="border-t">
                          <td className="px-3 py-2 align-middle"><input type="checkbox" name="ids" value={t.id} /></td>
                          <td className="px-3 py-2 align-middle min-w-0"><Link href={`/tasks/${t.id}`} className="hover:underline truncate inline-block max-w-[28ch]">{t.title}</Link></td>
                          <td className="px-3 py-2 align-middle">
                            <Badge className={t.status === "Completed" ? "bg-green-600 border-green-700 text-white" : t.status === "InProgress" ? "bg-indigo-600 border-indigo-700 text-white" : t.status === "Waiting" ? "bg-amber-500 border-amber-600 text-white" : "bg-zinc-700 border-zinc-800 text-white"}>{t.status === "Completed" ? "Tamamlandı" : t.status === "InProgress" ? "Devam Ediyor" : t.status === "Waiting" ? "Beklemede" : "Yapılacak"}</Badge>
                          </td>
                          <td className="px-3 py-2 align-middle">{t.priority}</td>
                          <td className="px-3 py-2 align-middle">{assignedLabel}</td>
                          <td className="px-3 py-2 align-middle">{dueLabel}</td>
                          <td className="px-3 py-2 align-middle">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem>
                                  <form
                                    className="flex items-center gap-2"
                                    action={async (formData: FormData) => {
                                      "use server";
                                      const s = String(formData.get("status") || "");
                                      if (s) await fetch(`/api/tasks?id=${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: s }) });
                                      const qs = new URLSearchParams();
                                      if (q) qs.set("q", q);
                                      if (statusFilter) qs.set("status", statusFilter);
                                      if (priorityFilter) qs.set("priority", priorityFilter);
                                      return (await import("next/navigation")).redirect(`/projects/${id}?${qs.toString()}#overview`);
                                    }}
                                  >
                                    <select name="status" defaultValue={t.status} className="rounded border px-2 py-1 text-xs">
                                      <option value="ToDo">Yapılacak</option>
                                      <option value="InProgress">Devam Ediyor</option>
                                      <option value="Waiting">Beklemede</option>
                                      <option value="Completed">Tamamlandı</option>
                                    </select>
                                    <Button type="submit" variant="outline" size="sm" className="text-[10px] p-1"><CheckCircle2 className="h-3 w-3" /></Button>
                                  </form>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <form
                                    className="flex items-center gap-2"
                                    action={async (formData: FormData) => {
                                      "use server";
                                      const p = String(formData.get("priority") || "");
                                      if (p) await fetch(`/api/tasks?id=${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority: p }) });
                                      const qs = new URLSearchParams();
                                      if (q) qs.set("q", q);
                                      if (statusFilter) qs.set("status", statusFilter);
                                      if (priorityFilter) qs.set("priority", priorityFilter);
                                      return (await import("next/navigation")).redirect(`/projects/${id}?${qs.toString()}#overview`);
                                    }}
                                  >
                                    <select name="priority" defaultValue={t.priority as any} className="rounded border px-2 py-1 text-xs">
                                      <option value="Low">Low</option>
                                      <option value="Medium">Medium</option>
                                      <option value="High">High</option>
                                      <option value="Critical">Critical</option>
                                    </select>
                                    <Button type="submit" variant="outline" size="sm" className="text-[10px] p-1"><Flag className="h-3 w-3" /></Button>
                                  </form>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <form
                                    className="flex items-center gap-2"
                                    action={async (formData: FormData) => {
                                      "use server";
                                      const to = String(formData.get("assignedToId") || "");
                                      await fetch(`/api/tasks?id=${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignedToId: to || null }) });
                                      const qs = new URLSearchParams();
                                      if (q) qs.set("q", q);
                                      if (statusFilter) qs.set("status", statusFilter);
                                      if (priorityFilter) qs.set("priority", priorityFilter);
                                      return (await import("next/navigation")).redirect(`/projects/${id}?${qs.toString()}#overview`);
                                    }}
                                  >
                                    <select name="assignedToId" defaultValue={t.assignedToId ?? ""} className="rounded border px-2 py-1 text-xs">
                                      <option value="">Atanmadı</option>
                                      {users.map((u) => (
                                        <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                                      ))}
                                    </select>
                                    <Button type="submit" variant="outline" size="sm" className="text-[10px] p-1"><User className="h-3 w-3" /></Button>
                                  </form>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <form
                                    className="flex items-center gap-2"
                                    action={async (formData: FormData) => {
                                      "use server";
                                      const due = String(formData.get("due") || "");
                                      await fetch(`/api/tasks?id=${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dueDate: due }) });
                                      const qs = new URLSearchParams();
                                      if (q) qs.set("q", q);
                                      if (statusFilter) qs.set("status", statusFilter);
                                      if (priorityFilter) qs.set("priority", priorityFilter);
                                      return (await import("next/navigation")).redirect(`/projects/${id}?${qs.toString()}#overview`);
                                    }}
                                  >
                                    <input type="date" name="due" defaultValue={t.dueDate ? (() => { const d = new Date(t.dueDate as any); const pad = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; })() : undefined} className="rounded border px-2 py-1 text-xs" />
                                    <Button type="submit" variant="outline" size="sm" className="text-[10px] p-1"><Calendar className="h-3 w-3" /></Button>
                                  </form>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Link href={`/tasks/${t.id}`} className="text-sm">Detaya git</Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
    <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 lg:py-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold truncate">{project.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge className={project.status === "Done" ? "bg-green-600 border-green-700 text-white" : project.status === "Blocked" ? "bg-red-600 border-red-700 text-white" : project.status === "Active" ? "bg-indigo-600 border-indigo-700 text-white" : "bg-zinc-700 border-zinc-800 text-white"}>{project.status === "Done" ? "Tamamlandı" : project.status === "Blocked" ? "Bloklu" : project.status === "Active" ? "Aktif" : "Planlandı"}</Badge>
            <span className="text-sm text-zinc-600">Toplam {total} • Tamamlanan {done} • %{completedPct}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/projects/${project.id}#kanban`} className="rounded border px-3 py-2 text-sm">Kanban</Link>
          <Link href={`/projects/${project.id}#overview`} className="rounded border px-3 py-2 text-sm">Görevler</Link>
          <ThemeToggle />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="transition duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">Toplam Görev</div>
            <ListTodo className="h-5 w-5 text-neutral-600" />
          </div>
          <div className="mt-1 text-2xl font-semibold">{total}</div>
        </Card>
        <Card className="transition duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">Tamamlanan</div>
            <CheckCircle2 className="h-5 w-5 text-neutral-600" />
          </div>
          <div className="mt-1 text-2xl font-semibold">{done}</div>
          <div className="mt-2">
            <Progress value={completedPct} />
          </div>
        </Card>
        <Card className="transition duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">Yaklaşan</div>
            <Calendar className="h-5 w-5 text-neutral-600" />
          </div>
          <div className="mt-1 space-y-1 text-sm text-zinc-700">
            {upcoming.length === 0 ? <div>Görev yok</div> : upcoming.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <span className="truncate">{t.title}</span>
                <span className="text-xs text-zinc-500">{t.dueDate?.toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="transition duration-200 hover:shadow-md hover:-translate-y-0.5">
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
  const tasks = await prisma.task.findMany({ where: { projectId }, orderBy: { startDate: "asc" } });
  const min = tasks.reduce<Date | null>((acc, t) => (!acc || (t.startDate && t.startDate < acc) ? t.startDate ?? acc : acc), null) ?? new Date();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <div className="space-y-2">
        {tasks.map((t) => {
          const start = t.startDate ?? min;
          const end = t.dueDate ?? start;
          const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
          return (
            <div key={t.id} className="flex items-center gap-2">
              <span className="w-48 text-sm">{t.title}</span>
              <div className="flex-1">
                <Progress value={Math.min(100, days * 5)} />
              </div>
            </div>
          );
        })}
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
    <Card>
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
