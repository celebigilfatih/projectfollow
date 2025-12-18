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
import { FolderKanban, ListTodo, CheckCircle2, Calendar, User, Flag, MoreVertical, Download, AlertTriangle, Clock } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/theme-toggle";

export default async function ProjectDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: Record<string, string | undefined> }) {
  const session = await getServerSession(authConfig as any);
  if (!session) return redirect("/login");
  const { id } = await (params as any);
  const project = await prisma.project.findUnique({ where: { id }, include: { tasks: true, responsible: true } });
  if (!project) return notFound();
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true }, where: { deleted: false } });
  const teams = await prisma.team.findMany({ select: { id: true, name: true } });
  const userId = (session as any).user?.id as string | undefined;
  const total = project.tasks.length;
  const done = project.tasks.filter((t) => t.status === "Completed").length;
  const completedPct = total ? Math.round((done / total) * 100) : 0;
  const sp = searchParams ? await (searchParams as any) : {};
  const q = sp.q && sp.q !== "" ? sp.q : "";
  const statusFilter = sp.status && sp.status !== "" ? sp.status : "";
  const priorityFilter = sp.priority && sp.priority !== "" ? sp.priority : "";
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
          <div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="rounded-md border border-[var(--border)] bg-white">
                  <CardHeader>
                    <CardTitle className="text-sm">Açıklama</CardTitle>
                  </CardHeader>
                  <div className="px-3 pb-3 text-sm text-zinc-700 whitespace-pre-line">{project.description ?? "-"}</div>
                </div>
                <div className="rounded-md border border-[var(--border)] bg-white">
                  <CardHeader>
                    <CardTitle className="text-sm">Kapsam</CardTitle>
                  </CardHeader>
                  <div className="px-3 pb-3 text-sm text-zinc-700">
                    {(() => {
                      const txt = project.scope?.trim();
                      const tokens = txt && txt.includes(",") ? txt.split(",").map((s) => s.trim()).filter(Boolean) : [];
                      if (tokens.length === 0) return <div className="whitespace-pre-line">{txt ?? "-"}</div>;
                      return (
                        <div className="flex flex-wrap gap-2">
                          {tokens.map((t) => (
                            <Link key={t} href={`/projects/${project.id}?q=${encodeURIComponent(t)}#overview`} className="inline-flex">
                              <Badge className="bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200">{t}</Badge>
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
                                <Link href={`/tasks/${t.id}`} className="truncate hover:underline">{t.title}</Link>
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
                                <Link href={`/tasks/${t.id}`} className="truncate hover:underline">{t.title}</Link>
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
                                <Link href={`/tasks/${t.id}`} className="truncate hover:underline">{t.title}</Link>
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
                    <CardTitle className="text-sm">Zaman ve Kayıt</CardTitle>
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
              <CardTitle>Görevler</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              <div className="flex items-center justify-end">
                <QuickTaskModal projectId={project.id} users={users} teams={teams} />
              </div>
            </div>
            <details className="mt-3 rounded-md border border-neutral-200 bg-white" open>
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-bold text-zinc-800">Filtreler</summary>
              <form
              className="px-3 pb-3 flex flex-nowrap items-end gap-2 overflow-x-auto whitespace-nowrap"
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
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-600">Durum</label>
                <select name="status" defaultValue={statusFilter} className="w-40 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm">
                  <option value="">Tümü</option>
                  <option value="ToDo">Yapılacak</option>
                  <option value="InProgress">Devam Ediyor</option>
                  <option value="Waiting">Beklemede</option>
                  <option value="Completed">Tamamlandı</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-600">Öncelik</label>
                <select name="priority" defaultValue={priorityFilter} className="w-40 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm">
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
            </details>
            <details className="mt-3 rounded-md border border-neutral-200 bg-white" open>
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-bold text-zinc-800">Toplu İşlemler</summary>
              <form
              className="px-3 pb-3 overflow-x-auto whitespace-nowrap"
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
                <div className="flex flex-nowrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-600">İşlem</label>
                    <select name="op" className="w-48 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs">
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
                    <select name="bulkStatus" className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs">
                      <option value="">Seçiniz</option>
                      <option value="ToDo">Yapılacak</option>
                      <option value="InProgress">Devam Ediyor</option>
                      <option value="Waiting">Beklemede</option>
                      <option value="Completed">Tamamlandı</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-600">Öncelik</label>
                    <select name="bulkPriority" className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs">
                      <option value="">Seçiniz</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-600">Atama</label>
                    <select name="bulkAssignTo" className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs">
                      <option value="">Yok</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-600">Son tarih</label>
                    <input type="text" name="bulkDue" placeholder="gg.aa.yyyy" className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs" />
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
            </details>
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
        <div className="flex items-center justify-between py-2 gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold truncate">{project.title}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge className={project.status === "Done" ? "bg-green-600 border-green-700 text-white" : project.status === "Blocked" ? "bg-red-600 border-red-700 text-white" : project.status === "Active" ? "bg-indigo-600 border-indigo-700 text-white" : "bg-zinc-700 border-zinc-800 text-white"}>{project.status === "Done" ? "Tamamlandı" : project.status === "Blocked" ? "Bloklu" : project.status === "Active" ? "Aktif" : "Planlandı"}</Badge>
              <span className="text-sm text-zinc-600">Toplam {total} • Tamamlanan {done} • %{completedPct}</span>
            </div>
            <div className="mt-2 max-w-2xl"><Progress value={completedPct} /></div>
          </div>
          <div className="ml-auto flex items-center gap-2">
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
                <span className="truncate">{t.title}</span>
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
  const tasks = await prisma.task.findMany({ where: { projectId }, orderBy: { startDate: "asc" } });
  const min = tasks.reduce<Date | null>((acc, t) => (!acc || (t.startDate && t.startDate < acc) ? t.startDate ?? acc : acc), null) ?? new Date();
  return (
    <Card className="p-3 sm:p-4">
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <div className="space-y-2">
        {tasks.map((t) => {
          const start = t.startDate ?? min;
          const end = t.dueDate ?? start;
          const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
          const barClass = t.priority === "Critical"
            ? "bg-red-600"
            : t.priority === "High"
              ? "bg-amber-500"
              : t.priority === "Medium"
                ? "bg-indigo-600"
                : "bg-neutral-500";
          return (
            <div key={t.id} className="flex items-center gap-2" title={`${days} gün`}>
              <Link href={`/tasks/${t.id}`} className="w-48 text-sm truncate hover:underline">{t.title}</Link>
              <div className="flex-1">
                <Progress value={Math.min(100, days * 5)} barClassName={barClass} />
              </div>
              <Badge className={t.status === "Completed" ? "bg-green-600 border-green-700 text-white" : t.status === "InProgress" ? "bg-indigo-600 border-indigo-700 text-white" : t.status === "Waiting" ? "bg-amber-500 border-amber-600 text-white" : "bg-zinc-700 border-zinc-800 text-white"}>{t.status === "Completed" ? "Tamamlandı" : t.status === "InProgress" ? "Devam" : t.status === "Waiting" ? "Beklemede" : "Yapılacak"}</Badge>
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
