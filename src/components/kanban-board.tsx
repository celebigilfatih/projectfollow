"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, useDroppable, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Trash2, MoreVertical, User, Users, CalendarDays, AlertTriangle, ArrowUpCircle, ArrowDownCircle, Minus, CheckCircle, Plus } from "lucide-react";

type Task = {
  id: string;
  title: string;
  status: "ToDo" | "InProgress" | "Waiting" | "Completed";
  priority: "Low" | "Medium" | "High" | "Critical";
  assignedToId?: string | null;
  assignedTeamId?: string | null;
  dueDate?: string | null;
  subtasks?: { completed: boolean }[];
  assigneeIds?: string[];
};

const STATUSES: Task["status"][] = ["ToDo", "InProgress", "Waiting", "Completed"];
const STATUS_LABELS: Record<Task["status"], string> = {
  ToDo: "Yapılacak",
  InProgress: "Devam Ediyor",
  Waiting: "Beklemede",
  Completed: "Tamamlandı",
};

export default function KanbanBoard({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [priority, setPriority] = useState<string>("");
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [assignedTeamId, setAssignedTeamId] = useState<string>("");
  const [teamManagerId, setTeamManagerId] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [mine, setMine] = useState<boolean>(false);
  const [users, setUsers] = useState<Array<{ id: string; email: string; name: string | null }>>([]);
  const [teams, setTeams] = useState<Array<{ id: string; name: string; managerName?: string | null }>>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [newForm, setNewForm] = useState<Record<Task["status"], { title: string; priority: string; assignedToId: string; assignedTeamId: string; dueDate: string }>>({
    ToDo: { title: "", priority: "Medium", assignedToId: "", assignedTeamId: "", dueDate: "" },
    InProgress: { title: "", priority: "Medium", assignedToId: "", assignedTeamId: "", dueDate: "" },
    Waiting: { title: "", priority: "Medium", assignedToId: "", assignedTeamId: "", dueDate: "" },
    Completed: { title: "", priority: "Medium", assignedToId: "", assignedTeamId: "", dueDate: "" },
  });
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error"; undo?: boolean; retry?: boolean } | null>(null);
  const [undo, setUndo] = useState<{ kind: "status" | "priority" | "assign" | "delete"; ids: string[]; prevMap: Record<string, string | null>; newValue: string | null } | null>(null);
  const [lastOp, setLastOp] = useState<{ kind: "status" | "priority" | "assign" | "delete"; ids: string[]; value: string | null } | null>(null);
  const noticeTimer = useRef<number | undefined>(undefined);
  const deleteTimer = useRef<number | undefined>(undefined);
  const [noticeVariant, setNoticeVariant] = useState<"soft" | "solid">("soft");
  const [noticePos, setNoticePos] = useState<"top-right" | "top-left" | "bottom-right" | "bottom-left">("top-right");
  const noticeRef = useRef<HTMLDivElement | null>(null);
  const [compact, setCompact] = useState<boolean>(false);
  const [showBulk, setShowBulk] = useState<boolean>(false);
  const [wipLimits, setWipLimits] = useState<Record<Task["status"], number | null>>({ ToDo: null, InProgress: null, Waiting: null, Completed: null });
  const [wipTarget, setWipTarget] = useState<Task["status"]>("InProgress");
  const [wipValue, setWipValue] = useState<string>("3");
  const [noticeDuration, setNoticeDuration] = useState<number>(5000);
  const [now, setNow] = useState<number>(() => Date.now());
  const noticeInterval = useRef<number | undefined>(undefined);
  const noticeStartAt = useRef<number>(Date.now());
  const deleteStartAt = useRef<number | null>(null);
  const newInputRefs = useRef<Record<Task["status"], HTMLInputElement | null>>({ ToDo: null, InProgress: null, Waiting: null, Completed: null });

  function showNotice(n: { text: string; type: "success" | "error"; undo?: boolean; retry?: boolean }) {
    setNotice(n);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeStartAt.current = Date.now();
    noticeTimer.current = window.setTimeout(() => setNotice(null), noticeDuration);
    window.setTimeout(() => {
      noticeRef.current?.focus();
    }, 0);
  }

  useEffect(() => {
    if (notice) {
      if (noticeInterval.current) window.clearInterval(noticeInterval.current);
      noticeInterval.current = window.setInterval(() => setNow(Date.now()), 100);
      return () => {
        if (noticeInterval.current) window.clearInterval(noticeInterval.current);
      };
    } else {
      if (noticeInterval.current) window.clearInterval(noticeInterval.current);
    }
  }, [notice]);

  async function handleUndo() {
    if (!undo) return;
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    const { kind, ids, prevMap } = undo;
    if (kind === "status") {
      await Promise.all(ids.map((id) => fetch(`/api/tasks?id=${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: prevMap[id] }) })));
      setTasks((prev) => prev.map((x) => (ids.includes(x.id) ? { ...x, status: (prevMap[x.id] as Task["status"]) } : x)));
    } else if (kind === "priority") {
      await Promise.all(ids.map((id) => fetch(`/api/tasks?id=${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority: prevMap[id] }) })));
      setTasks((prev) => prev.map((x) => (ids.includes(x.id) ? { ...x, priority: (prevMap[x.id] as Task["priority"]) } : x)));
    } else if (kind === "assign") {
      await Promise.all(ids.map((id) => fetch(`/api/tasks?id=${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignedToId: prevMap[id] }) })));
      setTasks((prev) => prev.map((x) => (ids.includes(x.id) ? { ...x, assignedToId: prevMap[x.id] } : x)));
    } else if (kind === "delete") {
      if (deleteTimer.current) window.clearTimeout(deleteTimer.current);
    }
    setUndo(null);
    showNotice({ text: "Geri alındı", type: "success" });
  }

  async function handleRetry() {
    if (!lastOp) return;
    const { kind, ids, value } = lastOp;
    if (kind === "status") {
      const prevMap: Record<string, string | null> = Object.fromEntries(tasks.filter((t) => ids.includes(t.id)).map((t) => [t.id, t.status]));
      try {
        const res = await fetch(`/api/tasks/bulk`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, status: value }) });
        if (!res.ok) throw new Error();
        setTasks((prev) => prev.map((x) => (ids.includes(x.id) ? { ...x, status: (value as Task["status"]) } : x)));
        setUndo({ kind: "status", ids, prevMap, newValue: value });
        showNotice({ text: `Toplu durum güncellendi (${ids.length} öğe)`, type: "success", undo: true });
      } catch {
        showNotice({ text: "Toplu durum güncelleme hatası", type: "error", retry: true });
        if ("vibrate" in navigator) (navigator as any).vibrate(60);
      }
    } else if (kind === "priority") {
      const prevMap: Record<string, string | null> = Object.fromEntries(tasks.filter((t) => ids.includes(t.id)).map((t) => [t.id, t.priority]));
      try {
        const res = await fetch(`/api/tasks/bulk/priority`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, priority: value }) });
        if (!res.ok) throw new Error();
        setTasks((prev) => prev.map((x) => (ids.includes(x.id) ? { ...x, priority: (value as Task["priority"]) } : x)));
        setUndo({ kind: "priority", ids, prevMap, newValue: value });
        showNotice({ text: `Toplu öncelik güncellendi (${ids.length} öğe)`, type: "success", undo: true });
      } catch {
        showNotice({ text: "Toplu öncelik güncelleme hatası", type: "error", retry: true });
        if ("vibrate" in navigator) (navigator as any).vibrate(60);
      }
    } else if (kind === "assign") {
      const prevMap: Record<string, string | null> = Object.fromEntries(tasks.filter((t) => ids.includes(t.id)).map((t) => [t.id, t.assignedToId ?? null]));
      try {
        const res = await fetch(`/api/tasks/bulk/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, assignedToId: value }) });
        if (!res.ok) throw new Error();
        setTasks((prev) => prev.map((x) => (ids.includes(x.id) ? { ...x, assignedToId: value } : x)));
        setUndo({ kind: "assign", ids, prevMap, newValue: value });
        showNotice({ text: `Toplu atama güncellendi (${ids.length} öğe)`, type: "success", undo: true });
      } catch {
        showNotice({ text: "Toplu atama güncelleme hatası", type: "error", retry: true });
        if ("vibrate" in navigator) (navigator as any).vibrate(60);
      }
    } else if (kind === "delete") {
      try {
        const res = await fetch(`/api/tasks/bulk/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
        if (!res.ok) throw new Error();
        setTasks((prev) => prev.filter((x) => !ids.includes(x.id)));
        setUndo(null);
        showNotice({ text: `Toplu silindi (${ids.length} öğe)`, type: "success" });
        if ("vibrate" in navigator) (navigator as any).vibrate([20, 10, 20]);
      } catch {
        showNotice({ text: "Toplu silme hatası", type: "error", retry: true });
        if ("vibrate" in navigator) (navigator as any).vibrate(60);
      }
    }
  }

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const p = params.get("priority");
      if (p) setPriority(p);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams({ projectId });
      if (priority) params.set("priority", priority);
      if (assignedToId) params.set("assignedToId", assignedToId);
      if (assignedTeamId) params.set("assignedTeamId", assignedTeamId);
      if (q) params.set("q", q);
      if (mine) params.set("mine", "1");
      if (teamManagerId) params.set("teamManagerId", teamManagerId);
      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (!res.ok) {
        setTasks([]);
        return;
      }
      const data = await res.json();
      setTasks(Array.isArray(data) ? data.map((t: any) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, assignedToId: t.assignedToId ?? null, assignedTeamId: t.assignedTeamId ?? null, dueDate: t.dueDate ?? null, subtasks: t.subtasks ?? [] })) : []);
    })();
  }, [projectId, priority, assignedToId, assignedTeamId, q, mine, teamManagerId]);
  
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/users`);
      if (!res.ok) return;
      const data = await res.json();
      setUsers(Array.isArray(data) ? data.map((u: any) => ({ id: u.id, email: u.email, name: u.name ?? null })) : []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/teams`);
      if (!res.ok) return;
      const data = await res.json();
      setTeams(Array.isArray(data) ? data.map((t: any) => ({ id: t.id, name: t.name, managerName: (() => { const lead = Array.isArray(t.members) ? t.members.find((m: any) => m.role === "Manager" || m.role === "Lead") : null; const nm = lead?.user?.name ?? lead?.user?.email ?? null; return nm || null; })() })) : []);
    })();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`wip:${projectId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        setWipLimits((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, [projectId]);

  async function onDragEnd(e: DragEndEvent) {
    const activeId = e.active.id as string;
    const overId = e.over?.id as string | undefined;
    if (!overId) return;
    const columns = STATUSES.reduce<Record<Task["status"], string[]>>((acc, s) => {
      acc[s] = tasks.filter((t) => t.status === s).map((t) => t.id);
      return acc;
    }, { ToDo: [], InProgress: [], Waiting: [], Completed: [] });
    const sourceStatus = STATUSES.find((s) => columns[s].includes(activeId))!;
    let destStatus: Task["status"] | undefined;
    if (STATUSES.includes(overId as any)) destStatus = overId as Task["status"];
    else destStatus = STATUSES.find((s) => columns[s].includes(overId))!;
    if (!destStatus) return;
    const sourceIds = columns[sourceStatus];
    const destIds = columns[destStatus];
    const activeIndex = sourceIds.indexOf(activeId);
    let overIndex = destIds.indexOf(overId);
    if (overIndex === -1) overIndex = destIds.length; // drop to column

    // Remove from source, insert into dest
    const nextSourceIds = sourceIds.filter((id) => id !== activeId);
    const nextDestIds = [...destIds];
    if (sourceStatus === destStatus) {
      const reordered = arrayMove(destIds, activeIndex, overIndex);
      updateStateFromColumns({ ...columns, [destStatus]: reordered });
      await fetch(`/api/tasks/reorder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, status: destStatus, ids: reordered }) });
    } else {
      nextDestIds.splice(overIndex, 0, activeId);
      const newColumns = { ...columns, [sourceStatus]: nextSourceIds, [destStatus]: nextDestIds };
      updateStateFromColumns(newColumns);
      await fetch(`/api/tasks?id=${activeId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: destStatus }) });
      await fetch(`/api/tasks/reorder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, status: destStatus, ids: nextDestIds }) });
      await fetch(`/api/tasks/reorder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, status: sourceStatus, ids: nextSourceIds }) });
    }
  }

  function updateStateFromColumns(cols: Record<Task["status"], string[]>) {
    const idToTask = Object.fromEntries(tasks.map((t) => [t.id, t]));
    const next: Task[] = [];
    for (const s of STATUSES) {
      for (const id of cols[s]) next.push({ ...idToTask[id], status: s });
    }
    setTasks(next);
  }

  const grouped = useMemo(() => STATUSES.map((s) => ({ status: s, items: tasks.filter((t) => t.status === s) })), [tasks]);
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "Completed").length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  async function createTask(status: Task["status"]) {
    const f = newForm[status];
    const title = f.title.trim();
    if (!title) return;
    const body: any = { projectId, title, status };
    if (f.priority) body.priority = f.priority;
    if (f.assignedToId) body.assignedToId = f.assignedToId;
    if (f.assignedTeamId) body.assignedTeamId = f.assignedTeamId;
    if (f.dueDate) body.dueDate = f.dueDate;
    await fetch(`/api/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setNewForm((prev) => ({ ...prev, [status]: { ...prev[status], title: "", assignedToId: "", assignedTeamId: "", dueDate: "" } }));
    const res = await fetch(`/api/tasks?projectId=${projectId}`);
    const data = await res.json();
    setTasks(data.map((t: any) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, assignedToId: t.assignedToId ?? null, assignedTeamId: t.assignedTeamId ?? null, dueDate: t.dueDate ?? null, subtasks: t.subtasks ?? [], assigneeIds: Array.isArray(t.assignees) ? t.assignees.map((a: any) => a.userId) : [] })));
  }
  function exportSelectedCSV() {
    const rows = tasks.filter((t) => selected.includes(t.id));
    if (rows.length === 0) return;
    const header = ["id", "title", "status", "priority", "assignedTo", "dueDate"];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u.name ?? u.email]));
    const lines = rows.map((t) => {
      const vals = [t.id, t.title, t.status, t.priority, t.assignedToId ? (userMap[t.assignedToId] ?? t.assignedToId) : "", t.dueDate ?? ""];
      return vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks_${projectId}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showNotice({ text: `CSV oluşturuldu (${rows.length} öğe)`, type: "success" });
  }
  return (
    <TooltipProvider>
    <DndContext onDragEnd={onDragEnd}>
      <div className={`fixed z-50 ${noticePos === "top-right" ? "right-4 top-4" : noticePos === "top-left" ? "left-4 top-4" : noticePos === "bottom-right" ? "right-4 bottom-4" : "left-4 bottom-4"}`}>
        {notice ? (
          <div
            ref={noticeRef}
            tabIndex={-1}
            className={
              notice.type === "success"
                ? noticeVariant === "soft"
                  ? "rounded border border-green-600 bg-green-50 px-3 py-2 text-xs text-green-700 animate-in fade-in"
                  : "rounded bg-green-600 text-white px-3 py-2 text-xs animate-in fade-in"
                : noticeVariant === "soft"
                ? "rounded border border-red-600 bg-red-50 px-3 py-2 text-xs text-red-700 animate-in fade-in"
                : "rounded bg-red-600 text-white px-3 py-2 text-xs animate-in fade-in"
            }
          >
            <span>{notice.text}</span>
            {notice.undo ? (
              <button onClick={handleUndo} className="ml-3 underline">Geri Al</button>
            ) : null}
            {notice.retry ? (
              <button onClick={handleRetry} className="ml-3 underline">Yeniden Dene</button>
            ) : null}
            <div className="mt-2 h-1 w-40 rounded bg-neutral-200">
              <div
                className="h-1 rounded bg-neutral-700"
                style={{ width: `${Math.max(0, Math.min(100, Math.round(((now - noticeStartAt.current) / noticeDuration) * 100)))}%` }}
              />
            </div>
            {undo?.kind === "delete" && deleteStartAt.current ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-zinc-600">Geri alma: {Math.max(0, Math.ceil((3000 - (now - deleteStartAt.current)) / 1000))}sn</span>
                <div className="h-1 w-32 rounded bg-neutral-200">
                  <div
                    className="h-1 rounded bg-neutral-700"
                    style={{ width: `${Math.max(0, Math.min(100, Math.round(((now - deleteStartAt.current) / 3000) * 100)))}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <Card>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="text-sm text-zinc-700">Toplam: {total} • Tamamlanan: {done} • %{percent}</div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">Ayarlar</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <div className="space-y-2 p-1">
          <Select
            value={String(noticeDuration)}
            onChange={(e) => setNoticeDuration(Number(e.target.value))}
            className="w-full rounded border px-2 py-1 text-xs"
          >
            <option value="3000">Bildirim süresi: 3sn</option>
            <option value="5000">Bildirim süresi: 5sn</option>
            <option value="7000">Bildirim süresi: 7sn</option>
            <option value="10000">Bildirim süresi: 10sn</option>
          </Select>
                  <Select
                    value={wipTarget}
                    onChange={(e) => setWipTarget(e.target.value as Task["status"])}
                    className="w-full rounded border px-2 py-1 text-xs"
                  >
                    <option value="ToDo">WIP kolon: To Do</option>
                    <option value="InProgress">WIP kolon: In Progress</option>
                    <option value="Waiting">WIP kolon: Waiting</option>
                    <option value="Completed">WIP kolon: Completed</option>
                  </Select>
                  <input
                    type="number"
                    min={1}
                    value={wipValue}
                    onChange={(e) => setWipValue(e.target.value)}
                    className="w-full rounded border px-2 py-1 text-xs"
                  />
                  <button
                    onClick={() => {
                      const n = wipValue ? Math.max(1, parseInt(wipValue)) : null;
                      setWipLimits((prev) => {
                        const next = { ...prev, [wipTarget]: n };
                        try { localStorage.setItem(`wip:${projectId}`, JSON.stringify(next)); } catch {}
                        return next;
                      });
                      showNotice({ text: `WIP ayarlandı (${wipTarget}: ${wipValue})`, type: "success" });
                    }}
                    className="w-full rounded bg-neutral-800 px-2 py-1 text-xs text-white"
                  >WIP ayarla</button>
                  <Select
                    value={noticeVariant}
                    onChange={(e) => setNoticeVariant(e.target.value as any)}
                    className="w-full rounded border px-2 py-1 text-xs"
                  >
                    <option value="soft">Tema: Soft</option>
                    <option value="solid">Tema: Solid</option>
                  </Select>
                  <Select
                    value={noticePos}
                    onChange={(e) => setNoticePos(e.target.value as any)}
                    className="w-full rounded border px-2 py-1 text-xs"
                  >
                    <option value="top-right">Konum: Sağ üst</option>
                    <option value="top-left">Konum: Sol üst</option>
                    <option value="bottom-right">Konum: Sağ alt</option>
                    <option value="bottom-left">Konum: Sol alt</option>
                  </Select>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={exportSelectedCSV} disabled={selected.length === 0} variant="outline" size="sm" className="text-xs">CSV aktar</Button>
            <Button onClick={() => setSelected([])} variant="outline" size="sm" className="text-xs">Seçimi temizle</Button>
            <Button onClick={() => setCompact((v) => !v)} variant="outline" size="sm" className="text-xs">{compact ? "Geniş" : "Kompakt"}</Button>
            <Button onClick={() => setShowBulk((v) => !v)} variant="outline" size="sm" className="text-xs">{showBulk ? "Toplu işlemleri gizle" : "Toplu işlemleri göster"}</Button>
          </div>
        </div>
        <div className="px-4 py-2">
          <div className="h-2 w-48 rounded bg-neutral-200">
            <div className="h-2 rounded bg-neutral-700" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-1 text-xs text-zinc-600">Seçili: {selected.length}</div>
        </div>
        <div className="px-4 py-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara" className="text-sm" />
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="text-sm">
            <option value="">Öncelik (tümü)</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </Select>
          <Select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} className="text-sm">
            <option value="">Atanan (tümü)</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
            ))}
          </Select>
          <Select value={assignedTeamId} onChange={(e) => setAssignedTeamId(e.target.value)} className="text-sm">
            <option value="">Takım (tümü)</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{`${t.name}${t.managerName ? ` – Yönetici: ${t.managerName}` : ""}`}</option>
            ))}
          </Select>
          <Select value={teamManagerId} onChange={(e) => setTeamManagerId(e.target.value)} className="text-sm">
            <option value="">Yönetici (tümü)</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
            ))}
          </Select>
          <label className="md:col-span-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Sadece benim görevlerim</label>
        </div>
        {showBulk ? (
        <div className="px-4 py-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-md border bg-white p-2">
            <div className="mb-1 flex items-center gap-1 text-[10px] text-zinc-500"><CalendarDays className="h-3 w-3" /> Tarih</div>
            <input
              type="date"
              onChange={async (e) => {
              const value = e.target.value;
              if (selected.length === 0) return;
              const iso = value ? new Date(value).toISOString() : null;
              try {
                const res = await fetch(`/api/tasks/bulk/due`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selected, dueDate: iso }) });
                if (!res.ok) throw new Error("Tarih güncelleme başarısız");
                setTasks((prev) => prev.map((x) => (selected.includes(x.id) ? { ...x, dueDate: value } : x)));
                showNotice({ text: `Toplu tarih güncellendi (${selected.length} öğe)`, type: "success" });
              } catch {
                showNotice({ text: "Toplu tarih güncelleme hatası", type: "error", retry: true });
              }
              setSelected([]);
              }}
              className="rounded border px-2 py-1 text-xs"
            />
          </div>
          <div className="rounded-md border bg-white p-2">
            <div className="mb-1 flex items-center gap-1 text-[10px] text-zinc-500"><CheckCircle className="h-3 w-3" /> Durum</div>
            <Select
              defaultValue=""
            onChange={async (e) => {
              const value = e.target.value as Task["status"]; 
              if (!value || selected.length === 0) return;
              const prevMap: Record<string, string | null> = Object.fromEntries(tasks.filter((t) => selected.includes(t.id)).map((t) => [t.id, t.status]));
              try {
                const res = await fetch(`/api/tasks/bulk`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selected, status: value }) });
                if (!res.ok) throw new Error("Durum güncelleme başarısız");
                setTasks((prev) => prev.map((x) => (selected.includes(x.id) ? { ...x, status: value } : x)));
                setUndo({ kind: "status", ids: selected, prevMap, newValue: value });
                setLastOp({ kind: "status", ids: selected, value });
                showNotice({ text: `Toplu durum güncellendi (${selected.length} öğe)`, type: "success", undo: true });
              } catch {
                setLastOp({ kind: "status", ids: selected, value });
                showNotice({ text: "Toplu durum güncelleme hatası", type: "error", retry: true });
              }
              setSelected([]);
            }}
            className="rounded border px-2 py-1 text-xs"
          >
            <option value="">Toplu durum değiştir</option>
            <option value="ToDo">To Do</option>
            <option value="InProgress">In Progress</option>
            <option value="Waiting">Waiting</option>
            <option value="Completed">Completed</option>
          </Select>
          </div>
          <div className="rounded-md border bg-white p-2">
            <div className="mb-1 flex items-center gap-1 text-[10px] text-zinc-500"><AlertTriangle className="h-3 w-3" /> Öncelik</div>
            <Select
              defaultValue=""
            onChange={async (e) => {
              const value = e.target.value as Task["priority"]; 
              if (!value || selected.length === 0) return;
              const prevMap: Record<string, string | null> = Object.fromEntries(tasks.filter((t) => selected.includes(t.id)).map((t) => [t.id, t.priority]));
              try {
                const res = await fetch(`/api/tasks/bulk/priority`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selected, priority: value }) });
                if (!res.ok) throw new Error("Öncelik güncelleme başarısız");
                setTasks((prev) => prev.map((x) => (selected.includes(x.id) ? { ...x, priority: value } : x)));
                setUndo({ kind: "priority", ids: selected, prevMap, newValue: value });
                setLastOp({ kind: "priority", ids: selected, value });
                showNotice({ text: `Toplu öncelik güncellendi (${selected.length} öğe)`, type: "success", undo: true });
              } catch {
                setLastOp({ kind: "priority", ids: selected, value });
                showNotice({ text: "Toplu öncelik güncelleme hatası", type: "error", retry: true });
              }
              setSelected([]);
            }}
            className="rounded border px-2 py-1 text-xs"
          >
            <option value="">Toplu öncelik değiştir</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </Select>
          </div>
          <div className="rounded-md border bg-white p-2">
            <div className="mb-1 flex items-center gap-1 text-[10px] text-zinc-500"><User className="h-3 w-3" /> Kişi</div>
            <Select
              defaultValue=""
            onChange={async (e) => {
              const value = e.target.value;
              if (!value || selected.length === 0) return;
              const payload = { ids: selected, assignedToId: value === "__none__" ? null : value };
              const prevMap: Record<string, string | null> = Object.fromEntries(tasks.filter((t) => selected.includes(t.id)).map((t) => [t.id, t.assignedToId ?? null]));
              try {
                const res = await fetch(`/api/tasks/bulk/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                if (!res.ok) throw new Error("Atama güncelleme başarısız");
                setTasks((prev) => prev.map((x) => (selected.includes(x.id) ? { ...x, assignedToId: value === "__none__" ? null : value } : x)));
                setUndo({ kind: "assign", ids: selected, prevMap, newValue: value === "__none__" ? null : value });
                setLastOp({ kind: "assign", ids: selected, value: value === "__none__" ? null : value });
                showNotice({ text: `Toplu atama güncellendi (${selected.length} öğe)`, type: "success", undo: true });
              } catch {
                setLastOp({ kind: "assign", ids: selected, value: value === "__none__" ? null : value });
                showNotice({ text: "Toplu atama güncelleme hatası", type: "error", retry: true });
              }
              setSelected([]);
            }}
            className="rounded border px-2 py-1 text-xs"
          >
            <option value="">Toplu atama değiştir</option>
            <option value="__none__">Atananı kaldır</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
            ))}
          </Select>
          </div>
          <div className="rounded-md border bg-white p-2">
            <div className="mb-1 flex items-center gap-1 text-[10px] text-zinc-500"><Users className="h-3 w-3" /> Takım</div>
            <Select
              defaultValue=""
            onChange={async (e) => {
              const value = e.target.value;
              if (!value || selected.length === 0) return;
              const payload = { ids: selected, assignedTeamId: value === "__none__" ? null : value };
              const prevMap: Record<string, string | null> = Object.fromEntries(tasks.filter((t) => selected.includes(t.id)).map((t) => [t.id, t.assignedTeamId ?? null]));
              try {
                const res = await fetch(`/api/tasks/bulk/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                if (!res.ok) throw new Error("Takım atama güncelleme başarısız");
                setTasks((prev) => prev.map((x) => (selected.includes(x.id) ? { ...x, assignedTeamId: value === "__none__" ? null : value } : x)));
                setUndo({ kind: "assign", ids: selected, prevMap, newValue: value === "__none__" ? null : value });
                setLastOp({ kind: "assign", ids: selected, value: value === "__none__" ? null : value });
                showNotice({ text: `Toplu takım ataması güncellendi (${selected.length} öğe)`, type: "success", undo: true });
              } catch {
                setLastOp({ kind: "assign", ids: selected, value: value === "__none__" ? null : value });
                showNotice({ text: "Toplu takım atama güncelleme hatası", type: "error", retry: true });
              }
              setSelected([]);
            }}
            className="rounded border px-2 py-1 text-xs"
          >
            <option value="">Toplu takım ataması</option>
            <option value="__none__">Takım atamasını kaldır</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{`${t.name}${t.managerName ? ` – Yönetici: ${t.managerName}` : ""}`}</option>
            ))}
          </Select>
          </div>
          <button
            onClick={async () => {
              if (selected.length === 0) return;
              if (!confirm("Seçili görevleri silmek istiyor musunuz?")) return;
              const ids = [...selected];
              setSelected([]);
              if (deleteTimer.current) window.clearTimeout(deleteTimer.current);
              setUndo({ kind: "delete", ids, prevMap: {}, newValue: null });
              setLastOp({ kind: "delete", ids, value: null });
              showNotice({ text: `Silme beklemede (3sn) (${ids.length} öğe)`, type: "success", undo: true });
              deleteStartAt.current = Date.now();
              deleteTimer.current = window.setTimeout(async () => {
                try {
                  const res = await fetch(`/api/tasks/bulk/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
                  if (!res.ok) throw new Error("Toplu silme başarısız");
                  setTasks((prev) => prev.filter((x) => !ids.includes(x.id)));
                  setUndo(null);
                  showNotice({ text: `Toplu silindi (${ids.length} öğe)`, type: "success" });
                } catch {
                  setUndo(null);
                  showNotice({ text: "Toplu silme hatası", type: "error", retry: true });
                } finally {
                  deleteStartAt.current = null;
                }
              }, 3000);
            }}
            disabled={selected.length === 0}
            className="rounded bg-red-600 px-2 py-1 text-xs text-white"
          aria-label="Toplu sil" title="Toplu sil"><Trash2 className="h-4 w-4" /></button>
        </div>
        ) : null}
        <div className={compact ? "px-4 pb-4 w-full max-w-full overflow-x-clip grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "px-4 pb-4 w-full max-w-full overflow-x-hidden grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
        {grouped.map(({ status, items }) => {
          const colPercent = total ? Math.round((items.length / total) * 100) : 0;
          const subTotal = items.reduce((acc, it) => acc + ((it.subtasks?.length ?? 0)), 0);
          const subDone = items.reduce((acc, it) => acc + ((it.subtasks?.filter((s) => s.completed).length ?? 0)), 0);
          const colCompletion = subTotal ? Math.round((subDone / subTotal) * 100) : 0;
          const colSelectedCount = items.filter((it) => selected.includes(it.id)).length;
          return (
          <KanbanColumn
            key={status}
            id={status}
            label={STATUS_LABELS[status]}
            percent={colPercent}
            completion={colCompletion}
            selectedCount={colSelectedCount}
            onSelectAll={() => setSelected((prev) => Array.from(new Set([...prev, ...items.map((i) => i.id)])))}
            onClearSelection={() => setSelected((prev) => prev.filter((id) => !items.some((i) => i.id === id)))}
            limit={wipLimits[status] ?? null}
            overLimit={wipLimits[status] != null && items.length > (wipLimits[status] as number)}
            count={items.length}
            onAdd={() => newInputRefs.current[status]?.focus()}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((t) => (
                <KanbanCard
                  key={t.id}
                  id={t.id}
                  title={t.title}
                  priority={t.priority}
                  users={users}
                  teams={teams}
                  assignedToId={t.assignedToId ?? null}
                  assignedTeamId={t.assignedTeamId ?? null}
                  dueDate={t.dueDate ?? null}
                  assigneeIds={t.assigneeIds ?? []}
                  onDelete={() => setTasks((prev) => prev.filter((x) => x.id !== t.id))}
                  onStatusChange={async (newStatus) => {
                    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: newStatus } : x)));
                    await fetch(`/api/tasks?id=${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
                  }}
                  status={t.status}
                  selected={selected.includes(t.id)}
                  onToggleSelect={(checked) => setSelected((prev) => (checked ? [...prev, t.id] : prev.filter((x) => x !== t.id)))}
                />
              ))}
            </SortableContext>
            <div className="mt-2 flex items-center gap-2">
              <Input
                ref={(el) => { newInputRefs.current[status] = el; }}
                value={newForm[status].title}
                onChange={(e) => setNewForm((prev) => ({ ...prev, [status]: { ...prev[status], title: e.target.value } }))}
                onKeyDown={(e) => { if (e.key === "Enter") createTask(status); }}
                placeholder="Yeni görev başlığı"
                className="flex-1"
              />
              <Button onClick={() => createTask(status)} className="text-sm">Ekle</Button>
            </div>
          </KanbanColumn>
        );})}
        </div>
      </Card>
    </DndContext>
    </TooltipProvider>
  );
}

function KanbanColumn({ id, label, percent: _percent, completion: _completion, children, onSelectAll: _onSelectAll, onClearSelection: _onClearSelection, selectedCount: _selectedCount, limit, overLimit, count, onAdd }: { id: Task["status"]; label: string; percent?: number; completion?: number; children: React.ReactNode; onSelectAll?: () => void; onClearSelection?: () => void; selectedCount?: number; limit?: number | null; overLimit?: boolean; count?: number; onAdd?: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  void _percent; void _completion; void _onSelectAll; void _onClearSelection; void _selectedCount;
  return (
    <Card className={overLimit ? "min-w-0 border-red-300" : `min-w-0 ${id === "Completed" ? "border-green-300" : id === "InProgress" ? "border-indigo-300" : id === "Waiting" ? "border-amber-300" : "border-zinc-300"}`}>
      <div className={`border-b px-3 py-2 text-sm font-medium flex items-center justify-between gap-2 min-w-0 ${id === "Completed" ? "bg-green-50 text-green-800 border-green-300" : id === "InProgress" ? "bg-indigo-50 text-indigo-800 border-indigo-300" : id === "Waiting" ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-zinc-50 text-zinc-800 border-zinc-300"}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`${id === "Completed" ? "bg-green-600" : id === "InProgress" ? "bg-indigo-600" : id === "Waiting" ? "bg-amber-500" : "bg-zinc-600"} h-2 w-2 rounded-full`} />
          <span className="truncate">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          {typeof limit === "number" && typeof count === "number" ? (
            <span className={overLimit ? "text-xs text-red-600" : "text-xs text-zinc-500"}>WIP {count}/{limit}</span>
          ) : null}
          {typeof count === "number" ? (
            <span className="text-xs text-zinc-600">{count} Görev</span>
          ) : null}
          {onAdd ? (
            <button onClick={onAdd} className="rounded border px-2 py-1 text-[10px]">
              <Plus className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>
      <div ref={setNodeRef} className={`min-h-40 max-h-[64vh] overflow-y-auto overflow-x-hidden overscroll-contain space-y-2 p-3 ${isOver ? (id === "Completed" ? "ring-2 ring-green-600" : id === "InProgress" ? "ring-2 ring-indigo-600" : id === "Waiting" ? "ring-2 ring-amber-500" : "ring-2 ring-zinc-600") : ""}`}>{children}</div>
    </Card>
  );
}

function KanbanCard({ id, title, priority, users, teams, assignedToId, assignedTeamId, dueDate, assigneeIds = [], onDelete, onStatusChange: _onStatusChange, selected, onToggleSelect, status }: { id: string; title: string; priority: Task["priority"]; users: Array<{ id: string; email: string; name: string | null }>; teams: Array<{ id: string; name: string; managerName?: string | null }>; assignedToId: string | null; assignedTeamId: string | null; dueDate: string | null; assigneeIds?: string[]; onDelete: () => void; onStatusChange: (status: Task["status"]) => void; selected: boolean; onToggleSelect: (checked: boolean) => void; status: Task["status"] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id });
  const style: React.CSSProperties = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {};
  void _onStatusChange;
  const formattedDate = dueDate ? (() => {
    try {
      const d = new Date(String(dueDate));
      return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return String(dueDate);
    }
  })() : null;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`cursor-move rounded border p-2 text-sm ${status === "Completed" ? "bg-green-50 border-green-300" : status === "InProgress" ? "bg-indigo-50 border-indigo-300" : status === "Waiting" ? "bg-amber-50 border-amber-300" : "bg-zinc-50 border-zinc-300"} ${isDragging ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onToggleSelect(e.target.checked)}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <Badge className={(priority === "Critical" ? "bg-red-100 border-red-200 text-red-700" : priority === "High" ? "bg-orange-100 border-orange-200 text-orange-700" : priority === "Medium" ? "bg-blue-100 border-blue-200 text-blue-700" : "bg-zinc-100 border-zinc-200 text-zinc-700") + " gap-1"}>
            {priority === "Critical" ? <AlertTriangle className="h-3 w-3" /> : priority === "High" ? <ArrowUpCircle className="h-3 w-3" /> : priority === "Medium" ? <Minus className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
            {priority === "Critical" ? "Acil" : priority}
          </Badge>
          <span className="font-medium truncate" title={title}>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} aria-label="Diğer" title="Diğer">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); location.href = `/tasks/${id}`; }}
                className="w-full rounded px-2 py-1 text-left text-sm hover:bg-neutral-100"
              >Görev Aç</button>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm("Görevi silmek istiyor musunuz?")) return;
                  const res = await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
                  if (res.ok) onDelete();
                }}
                className="w-full rounded px-2 py-1 text-left text-sm text-red-700 hover:bg-red-50"
              >Sil</button>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
        {formattedDate ? (
          <div className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Son Tarih {formattedDate}</div>
        ) : null}
        {assignedToId ? (
          <div className="flex items-center gap-1"><User className="h-3 w-3" /> {(users.find((u) => u.id === assignedToId)?.name ?? users.find((u) => u.id === assignedToId)?.email) || ""}</div>
        ) : null}
        {assignedTeamId ? (
          <div className="flex items-center gap-1"><Users className="h-3 w-3" /> {(() => { const tm = teams.find((t) => t.id === assignedTeamId); return tm ? `${tm.name}${tm.managerName ? ` • Yönetici: ${tm.managerName}` : ""}` : ""; })()}</div>
        ) : null}
        {assigneeIds && assigneeIds.length > 0 ? (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>
              {assigneeIds.slice(0, 2).map((uid) => users.find((u) => u.id === uid)?.name ?? users.find((u) => u.id === uid)?.email).filter(Boolean).join(", ")}
              {assigneeIds.length > 2 ? ` +${assigneeIds.length - 2}` : ""}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
