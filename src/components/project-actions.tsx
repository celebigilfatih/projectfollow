"use client";
import { useCallback, useEffect, useState, ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Pencil, Trash2, Eye, X, Download, FolderKanban, MoreHorizontal, ChevronDown, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import NotesPanel from "@/components/notes-panel";
import QuickTaskModal from "@/components/quick-task-modal";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type Project = {
  id: string;
  title: string;
  description?: string | null;
  scope?: string | null;
  status?: string;
  responsible?: { id: string; name: string | null; email: string } | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  taskCount?: number;
  completedCount?: number;
};

export default function ProjectActions({ project }: { project: Project }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [scope, setScope] = useState(project.scope ?? "");
  const [status, setStatus] = useState(project.status ?? "Planned");
  const [viewStatus, setViewStatus] = useState(project.status ?? "Planned");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; status: string; priority: string; dueDate?: string | null; assignedToId?: string | null }>>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [mineFilter, setMineFilter] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [dateRange, setDateRange] = useState("");
  const [visibleCount, setVisibleCount] = useState(5);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkPriority, setBulkPriority] = useState("");
  const [bulkAssignTo, setBulkAssignTo] = useState("");
  const [bulkAssignTeam, setBulkAssignTeam] = useState("");
  const [bulkDue, setBulkDue] = useState("");
  const [applyingBulk, setApplyingBulk] = useState(false);
  const [selectedResponsibleId, setSelectedResponsibleId] = useState<string>(project.responsible?.id ?? "");
  const [assigningResponsible, setAssigningResponsible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ info: true, dates: false, description: false, scope: false, meta: false, progress: true, actions: false });
  const fmt = (d?: string | Date | null) => (d ? new Date(d).toLocaleString() : "-");
  const pct = project.taskCount ? Math.round(((project.completedCount ?? 0) / project.taskCount) * 100) : 0;
  const statusBadgeClass = project.status === "Done" ? "bg-green-600 border-green-700 text-white" : project.status === "Blocked" ? "bg-red-600 border-red-700 text-white" : project.status === "Active" ? "bg-indigo-600 border-indigo-700 text-white" : "bg-zinc-700 border-zinc-800 text-white";
  const statusLabel = project.status === "Done" ? "Tamamlandı" : project.status === "Blocked" ? "Bloklu" : project.status === "Active" ? "Aktif" : "Planlandı";

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) return;
        const data = await res.json();
        setUsers(data.map((u: any) => ({ id: u.id, name: u.name ?? null, email: u.email })));
      } catch {}
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/teams");
        if (!res.ok) return;
        const data = await res.json();
        setTeams(Array.isArray(data) ? data.map((t: any) => ({ id: t.id, name: t.name })) : []);
      } catch {}
    };
    run();
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const params = new URLSearchParams({ projectId: project.id });
      if (q.trim()) params.set("q", q.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (mineFilter) params.set("mine", "1");
      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      let items = Array.isArray(data) ? data.map((t: any) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate ?? null, assignedToId: t.assignedToId ?? null })) : [];
      if (hideCompleted) items = items.filter((t) => t.status !== "Completed");
      const now = new Date();
      if (upcomingOnly) items = items.filter((t) => t.dueDate && new Date(t.dueDate) >= now);
      if (overdueOnly) items = items.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "Completed");
      if (dateRange) {
        const start = new Date(now);
        const end = new Date(now);
        if (dateRange === "last7") {
          start.setDate(start.getDate() - 7);
          items = items.filter((t) => t.dueDate && new Date(t.dueDate) >= start && new Date(t.dueDate) <= end);
        } else if (dateRange === "last30") {
          start.setDate(start.getDate() - 30);
          items = items.filter((t) => t.dueDate && new Date(t.dueDate) >= start && new Date(t.dueDate) <= end);
        } else if (dateRange === "next7") {
          end.setDate(end.getDate() + 7);
          items = items.filter((t) => t.dueDate && new Date(t.dueDate) >= start && new Date(t.dueDate) <= end);
        } else if (dateRange === "next30") {
          end.setDate(end.getDate() + 30);
          items = items.filter((t) => t.dueDate && new Date(t.dueDate) >= start && new Date(t.dueDate) <= end);
        }
      }
      setTasks(items);
      setSelected((prev) => prev.filter((id) => items.some((t) => t.id === id)));
    } catch {}
    finally {
      setLoadingTasks(false);
    }
  }, [project.id, q, statusFilter, priorityFilter, mineFilter, hideCompleted, upcomingOnly, overdueOnly, dateRange]);

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function selectAllVisible() {
    const visible = tasks
      .slice()
      .sort((a, b) => {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return ad - bd;
      })
      .slice(0, visibleCount)
      .map((t) => t.id);
    setSelected(visible);
  }
  function clearSelection() {
    setSelected([]);
  }

  function exportSelectedCSV() {
    const rows = tasks.filter((t) => selected.includes(t.id));
    if (rows.length === 0) return;
    const header = ["id", "title", "status", "priority", "dueDate", "assignedTo"];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u.name ?? u.email]));
    const lines = rows.map((t) => {
      const assigned = t.assignedToId ? (userMap[t.assignedToId] ?? t.assignedToId) : "";
      const vals = [t.id, t.title, t.status, t.priority, t.dueDate ?? "", assigned];
      return vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks_${project.id}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  function exportCSVAll() {
    const rows = tasks.slice();
    if (rows.length === 0) return;
    const header = ["id", "title", "status", "priority", "dueDate", "assignedTo"];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u.name ?? u.email]));
    const lines = rows.map((t) => {
      const assigned = t.assignedToId ? (userMap[t.assignedToId] ?? t.assignedToId) : "";
      const vals = [t.id, t.title, t.status, t.priority, t.dueDate ?? "", assigned];
      return vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks_${project.id}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async function applyBulk(op: "status" | "priority" | "assign" | "unassign" | "due" | "due_clear" | "delete" | "due_rel_today" | "due_rel_3d" | "due_rel_1w") {
    if (selected.length === 0) return;
    setApplyingBulk(true);
    try {
      const ids = selected.slice();
      async function post(url: string, body: any) {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error("bulk_failed");
      }
      if (op === "status") {
        if (!bulkStatus) return;
        await post(`/api/tasks/bulk`, { ids, status: bulkStatus });
        toast.success(`Durum güncellendi (${ids.length})`);
      } else if (op === "priority") {
        if (!bulkPriority) return;
        await post(`/api/tasks/bulk/priority`, { ids, priority: bulkPriority });
        toast.success(`Öncelik güncellendi (${ids.length})`);
      } else if (op === "assign") {
        await post(`/api/tasks/bulk/assign`, { ids, assignedToId: bulkAssignTo || null, assignedTeamId: bulkAssignTeam || null });
        toast.success(`Atama yapıldı (${ids.length})`);
      } else if (op === "unassign") {
        await post(`/api/tasks/bulk/assign`, { ids, assignedToId: null, assignedTeamId: null });
        toast.success(`Atama kaldırıldı (${ids.length})`);
      } else if (op === "due") {
        await post(`/api/tasks/bulk/due`, { ids, dueDate: bulkDue });
        toast.success(`Son tarih ayarlandı (${ids.length})`);
      } else if (op === "due_clear") {
        await post(`/api/tasks/bulk/due`, { ids, dueDate: "" });
        toast.success(`Son tarih kaldırıldı (${ids.length})`);
      } else if (op === "delete") {
        if (!confirm("Seçili görevleri silmek istiyor musunuz?")) { setApplyingBulk(false); return; }
        await post(`/api/tasks/bulk/delete`, { ids });
        toast.success(`Görevler silindi (${ids.length})`);
      } else if (op === "due_rel_today" || op === "due_rel_3d" || op === "due_rel_1w") {
        const base = new Date();
        const addDays = op === "due_rel_today" ? 0 : op === "due_rel_3d" ? 3 : 7;
        base.setDate(base.getDate() + addDays);
        const pad = (n: number) => String(n).padStart(2, "0");
        const dateStr = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
        await post(`/api/tasks/bulk/due`, { ids, dueDate: dateStr });
        toast.success(`Son tarih ayarlandı (${ids.length})`);
      }
      setBulkStatus("");
      setBulkPriority("");
      setBulkAssignTo("");
      setBulkAssignTeam("");
      setBulkDue("");
      clearSelection();
      await fetchTasks();
    } catch {
      toast.error("Toplu işlem başarısız");
    } finally {
      setApplyingBulk(false);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects?id=${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, scope, status }),
      });
      if (res.ok) {
        toast.success("Proje güncellendi");
        setEditOpen(false);
        location.reload();
      } else {
        toast.error("Proje güncelleme başarısız");
      }
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects?id=${project.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Proje silindi");
        setDeleteOpen(false);
        location.reload();
      } else {
        toast.error("Proje silme başarısız");
      }
    } finally {
      setDeleting(false);
    }
  }

  async function updateStatusQuick() {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/projects?id=${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: viewStatus }),
      });
      if (res.ok) {
        toast.success("Durum güncellendi");
        router.refresh();
      } else {
        toast.error("Durum güncellenemedi");
      }
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function updateResponsibleQuick() {
    setAssigningResponsible(true);
    try {
      const res = await fetch(`/api/projects?id=${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responsibleId: selectedResponsibleId || null }),
      });
      if (res.ok) {
        toast.success("Sorumlu güncellendi");
        router.refresh();
      } else {
        toast.error("Sorumlu güncellenemedi");
      }
    } finally {
      setAssigningResponsible(false);
    }
  }

  function Collapsible({ id, title, children }: { id: string; title: string; children: ReactNode }) {
    const isOpen = openSections[id];
    return (
      <div className="rounded-md border border-neutral-200">
        <button type="button" onClick={() => setOpenSections((prev) => ({ ...prev, [id]: !isOpen }))} className="flex w-full items-center justify-between px-3 py-2 cursor-pointer select-none">
          <div className="text-sm font-bold text-zinc-800">{title}</div>
          {isOpen ? <ChevronDown className="h-4 w-4 text-zinc-600" /> : <ChevronRight className="h-4 w-4 text-zinc-600" />}
        </button>
        {isOpen ? <div className="p-3 space-y-2">{children}</div> : null}
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <Link href={`/projects/${project.id}`} aria-label="Detay" title="Detay" className="inline-flex h-8 items-center justify-center rounded border px-2 text-xs"><Eye className="h-4 w-4" /></Link>
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} aria-label="Düzenle" title="Düzenle"><Pencil className="h-4 w-4" /></Button>
      <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} aria-label="Sil" title="Sil"><Trash2 className="h-4 w-4" /></Button>

      <Dialog open={viewOpen} onOpenChange={setViewOpen} contentClassName="fixed inset-0 z-50 grid place-items-center p-4">
        <DialogContent className="h-[80vh] w-full max-w-[1000px] rounded-lg p-0 shadow-xl flex flex-col">
          <DialogHeader className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-neutral-200 px-4 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="truncate">{project.title}</DialogTitle>
                  <Badge className={statusBadgeClass}>{statusLabel}</Badge>
                </div>
                <div className="mt-1 text-xs text-zinc-600">Tamamlanan {project.completedCount ?? 0}/{project.taskCount ?? 0} • %{pct}</div>
                <div className="mt-1"><Progress value={pct} barClassName="bg-indigo-600" /></div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <QuickTaskModal projectId={project.id} users={users} teams={teams} label="Görev Ekle" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-1"><MoreHorizontal className="h-4 w-4" />İşlemler</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); exportCSVAll(); }} className="flex items-center gap-2"><Download className="h-4 w-4" />CSV (Tümü)</DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); router.push(`/kanban?projectId=${project.id}`); }} className="flex items-center gap-2"><FolderKanban className="h-4 w-4" />Kanban’a git</DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setEditOpen(true); }} className="flex items-center gap-2"><Pencil className="h-4 w-4" />Projeyi düzenle</DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setDeleteOpen(true); }} className="flex items-center gap-2 text-red-600"><Trash2 className="h-4 w-4" />Projeyi sil</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="sm" onClick={() => setViewOpen(false)} aria-label="Kapat"><X className="h-4 w-4" /></Button>
              </div>
            </div>
          </DialogHeader>
          <div className="px-4 pb-4 overflow-y-auto flex-1">
            <Tabs
              tabs={[
                {
                  id: "overview",
                  label: "Genel",
                  content: (
                    <div className="space-y-3">
                      <Collapsible id="info" title="Proje Bilgileri">
                        <div>
                          <div className="mb-1 text-xs text-zinc-600">Başlık</div>
                          <div className="text-sm">{project.title}</div>
                        </div>
                        <div>
                          <div className="mb-1 text-xs text-zinc-600">Durum</div>
                          <div className="text-sm">{project.status ?? "-"}</div>
                        </div>
                        <div>
                          <div className="mb-1 text-xs text-zinc-600">Sorumlu</div>
                          <div className="text-sm">{project.responsible ? (project.responsible.name ?? project.responsible.email) : "-"}</div>
                        </div>
                      </Collapsible>
                      <Collapsible id="dates" title="Tarih">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <div>
                            <div className="mb-1 text-xs text-zinc-600">Başlangıç</div>
                            <div className="text-sm">{fmt(project.startDate)}</div>
                          </div>
                          <div>
                            <div className="mb-1 text-xs text-zinc-600">Bitiş</div>
                            <div className="text-sm">{fmt(project.endDate)}</div>
                          </div>
                        </div>
                      </Collapsible>
                      <Collapsible id="description" title="Açıklama">
                        <div className="text-sm whitespace-pre-line">{project.description ?? "-"}</div>
                      </Collapsible>
                      <Collapsible id="scope" title="Kapsam">
                        <div className="text-sm whitespace-pre-line">{project.scope ?? "-"}</div>
                      </Collapsible>
                      <Collapsible id="meta" title="Kayıt Bilgileri">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <div>
                            <div className="mb-1 text-xs text-zinc-600">Oluşturulma</div>
                            <div className="text-sm">{fmt(project.createdAt)}</div>
                          </div>
                          <div>
                            <div className="mb-1 text-xs text-zinc-600">Güncelleme</div>
                            <div className="text-sm">{fmt(project.updatedAt)}</div>
                          </div>
                        </div>
                      </Collapsible>
                      
                      <Collapsible id="actions" title="Hızlı İşlemler">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <div>
                            <div className="mb-1 text-xs text-zinc-600">Durumu değiştir</div>
                            <div className="flex items-center gap-2">
                              <Select value={viewStatus} onChange={(e) => setViewStatus(e.target.value)} className="rounded border px-2 py-1 text-xs">
                                <option value="Planned">Planned</option>
                                <option value="Active">Active</option>
                                <option value="Blocked">Blocked</option>
                                <option value="Done">Done</option>
                              </Select>
                              <Button size="sm" onClick={updateStatusQuick} disabled={updatingStatus}>Kaydet</Button>
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 text-xs text-zinc-600">Sorumlu ata</div>
                            <div className="flex items-center gap-2">
                              <Select value={selectedResponsibleId} onChange={(e) => setSelectedResponsibleId(e.target.value)} className="rounded border px-2 py-1 text-xs">
                                <option value="">Seçim yok</option>
                                {users.map((u) => (
                                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                                ))}
                              </Select>
                              <Button size="sm" onClick={updateResponsibleQuick} disabled={assigningResponsible}>Kaydet</Button>
                            </div>
                          </div>
                        </div>
                      </Collapsible>
                      <div className="flex items-center justify-end">
                        <Button variant="ghost" onClick={() => setViewOpen(false)}>Kapat</Button>
                      </div>
                    </div>
                  ),
                },
                {
                  id: "notes",
                  label: "Notlar",
                  content: <NotesPanel projectId={project.id} />,
                },
                {
                  id: "tasks",
                  label: "Görevler",
                  content: (
                    <div className="space-y-3">
                      <div className="flex items-center justify-end">
                        <QuickTaskModal projectId={project.id} users={users} teams={teams} />
                      </div>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-xs text-zinc-500">Ara</label>
                          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Başlık/Açıklama" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-zinc-500">Durum</label>
                          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">Tümü</option>
                            <option value="ToDo">Yapılacak</option>
                            <option value="InProgress">Devam Ediyor</option>
                            <option value="Waiting">Beklemede</option>
                            <option value="Completed">Tamamlandı</option>
                          </Select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-zinc-500">Öncelik</label>
                          <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                            <option value="">Tümü</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </Select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-zinc-500">Tarih</label>
                          <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                            <option value="">Tümü</option>
                            <option value="last7">Son 7 gün</option>
                            <option value="last30">Son 30 gün</option>
                            <option value="next7">Önümüzdeki 7 gün</option>
                            <option value="next30">Önümüzdeki 30 gün</option>
                          </Select>
                        </div>
                        <div className="flex items-end gap-3">
                          <label className="flex items-center gap-2 text-xs text-zinc-600">
                            <input type="checkbox" checked={mineFilter} onChange={(e) => setMineFilter(e.target.checked)} /> Benim
                          </label>
                          <label className="flex items-center gap-2 text-xs text-zinc-600">
                            <input type="checkbox" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} /> Tamamlananları gizle
                          </label>
                          <label className="flex items-center gap-2 text-xs text-zinc-600">
                            <input type="checkbox" checked={upcomingOnly} onChange={(e) => { const v = e.target.checked; setUpcomingOnly(v); if (v) setOverdueOnly(false); }} /> Yaklaşan
                          </label>
                          <label className="flex items-center gap-2 text-xs text-zinc-600">
                            <input type="checkbox" checked={overdueOnly} onChange={(e) => { const v = e.target.checked; setOverdueOnly(v); if (v) setUpcomingOnly(false); }} /> Geciken
                          </label>
                          <Button variant="ghost" size="sm" onClick={() => { setQ(""); setStatusFilter(""); setPriorityFilter(""); setMineFilter(false); setHideCompleted(false); setUpcomingOnly(false); setOverdueOnly(false); setDateRange(""); }}>Temizle</Button>
                        </div>
                      </div>
                      <div className="rounded border border-neutral-200">
                        {tasks.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-zinc-500">Görev bulunamadı</div>
                        ) : (
                          <ul className="divide-y divide-neutral-200">
                            {tasks
                              .slice()
                              .sort((a, b) => {
                                const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                                const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                                return ad - bd;
                              })
                              .slice(0, visibleCount)
                              .map((t) => (
                                <li key={t.id} className="flex items-center justify-between px-3 py-2 hover:bg-neutral-50">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleSelect(t.id)} />
                                    <div className="truncate text-sm">{t.title}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={t.priority === "Critical" ? "bg-red-100 border-red-200 text-red-700" : t.priority === "High" ? "bg-orange-100 border-orange-200 text-orange-700" : t.priority === "Medium" ? "bg-blue-100 border-blue-200 text-blue-700" : "bg-zinc-100 border-zinc-200 text-zinc-700"}>{t.priority}</Badge>
                                    {t.dueDate ? <span className="text-xs text-zinc-600">{new Date(t.dueDate).toLocaleDateString()}</span> : null}
                                    <Link href={`/tasks/${t.id}`} className="text-xs underline">Detay</Link>
                                  </div>
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                      <div className="rounded border border-neutral-200 bg-white p-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-zinc-600">Seçili: {selected.length}</div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={selectAllVisible}>Görüneni seç</Button>
                            <Button variant="outline" size="sm" onClick={clearSelection}>Temizle</Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-zinc-600">Durum</label>
                            <Select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="rounded border px-2 py-1 text-xs">
                              <option value="">Seçiniz</option>
                              <option value="ToDo">Yapılacak</option>
                              <option value="InProgress">Devam Ediyor</option>
                              <option value="Waiting">Beklemede</option>
                              <option value="Completed">Tamamlandı</option>
                            </Select>
                            <Button variant="outline" size="sm" onClick={() => applyBulk("status")} disabled={applyingBulk || !bulkStatus || selected.length === 0}>Uygula</Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-zinc-600">Öncelik</label>
                            <Select value={bulkPriority} onChange={(e) => setBulkPriority(e.target.value)} className="rounded border px-2 py-1 text-xs">
                              <option value="">Seçiniz</option>
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                              <option value="Critical">Critical</option>
                            </Select>
                            <Button variant="outline" size="sm" onClick={() => applyBulk("priority")} disabled={applyingBulk || !bulkPriority || selected.length === 0}>Uygula</Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-zinc-600">Atama</label>
                            <Select value={bulkAssignTo} onChange={(e) => setBulkAssignTo(e.target.value)} className="rounded border px-2 py-1 text-xs">
                              <option value="">Kişi yok</option>
                              {users.map((u) => (<option key={u.id} value={u.id}>{u.name ?? u.email}</option>))}
                            </Select>
                            <Select value={bulkAssignTeam} onChange={(e) => setBulkAssignTeam(e.target.value)} className="rounded border px-2 py-1 text-xs">
                              <option value="">Takım yok</option>
                              {teams.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                            </Select>
                            <Button variant="outline" size="sm" onClick={() => applyBulk("assign")} disabled={applyingBulk || selected.length === 0}>Ata</Button>
                            <Button variant="outline" size="sm" onClick={() => applyBulk("unassign")} disabled={applyingBulk || selected.length === 0}>Kaldır</Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-zinc-600">Son tarih</label>
                            <Input type="date" value={bulkDue} onChange={(e) => setBulkDue(e.target.value)} className="rounded border px-2 py-1 text-xs" />
                            <Button variant="outline" size="sm" onClick={() => applyBulk("due")} disabled={applyingBulk || selected.length === 0 || !bulkDue}>Ayarla</Button>
                            <Button variant="outline" size="sm" onClick={() => applyBulk("due_clear")} disabled={applyingBulk || selected.length === 0}>Kaldır</Button>
                            <Button variant="outline" size="sm" onClick={() => applyBulk("due_rel_today")} disabled={applyingBulk || selected.length === 0}>Bugün</Button>
                            <Button variant="outline" size="sm" onClick={() => applyBulk("due_rel_3d")} disabled={applyingBulk || selected.length === 0}>+3 gün</Button>
                            <Button variant="outline" size="sm" onClick={() => applyBulk("due_rel_1w")} disabled={applyingBulk || selected.length === 0}>+1 hafta</Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="destructive" size="sm" onClick={() => applyBulk("delete")} disabled={applyingBulk || selected.length === 0}>Sil</Button>
                            <Button variant="outline" size="sm" onClick={exportSelectedCSV} disabled={selected.length === 0}>CSV dışa aktar</Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-zinc-600">Gösterim</label>
                          <Select value={String(visibleCount)} onChange={(e) => setVisibleCount(Number(e.target.value))} className="w-24">
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="20">20</option>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => Math.min(c + 5, tasks.length))} disabled={visibleCount >= tasks.length}>Daha fazla göster</Button>
                          <Button variant="outline" size="sm" onClick={() => fetchTasks()} disabled={loadingTasks}>{loadingTasks ? "Yükleniyor..." : "Yenile"}</Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-end">
                        <Link href={`/kanban?projectId=${project.id}`} className="rounded border px-3 py-1.5 text-sm">Kanban</Link>
                      </div>
                    </div>
                  ),
                },
              ]}
              defaultTab="overview"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proje Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Açıklama" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Textarea placeholder="Kapsam" value={scope} onChange={(e) => setScope(e.target.value)} />
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full">
              <option value="Planned">Planned</option>
              <option value="Active">Active</option>
              <option value="Blocked">Blocked</option>
              <option value="Done">Done</option>
            </Select>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditOpen(false)}>Kapat</Button>
              <Button onClick={save} disabled={saving}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Projeyi sil</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Bu işlemi onaylıyor musunuz? Bu proje ve ilişkili görevler kalıcı olarak silinecek.</p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Vazgeç</Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleting} aria-label="Sil" title="Sil"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
