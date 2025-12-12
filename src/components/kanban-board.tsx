"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, useDroppable, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";

type Task = {
  id: string;
  title: string;
  status: "ToDo" | "InProgress" | "Waiting" | "Completed";
  priority: "Low" | "Medium" | "High" | "Critical";
  assignedToId?: string | null;
  dueDate?: string | null;
  subtasks?: { completed: boolean }[];
};

const STATUSES: Task["status"][] = ["ToDo", "InProgress", "Waiting", "Completed"];
const STATUS_LABELS: Record<Task["status"], string> = {
  ToDo: "To Do",
  InProgress: "In Progress",
  Waiting: "Waiting",
  Completed: "Completed",
};

export default function KanbanBoard({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [priority, setPriority] = useState<string>("");
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [mine, setMine] = useState<boolean>(false);
  const [users, setUsers] = useState<Array<{ id: string; email: string; name: string | null }>>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [newForm, setNewForm] = useState<Record<Task["status"], { title: string; priority: string; assignedToId: string; dueDate: string }>>({
    ToDo: { title: "", priority: "Medium", assignedToId: "", dueDate: "" },
    InProgress: { title: "", priority: "Medium", assignedToId: "", dueDate: "" },
    Waiting: { title: "", priority: "Medium", assignedToId: "", dueDate: "" },
    Completed: { title: "", priority: "Medium", assignedToId: "", dueDate: "" },
  });
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error"; undo?: boolean; retry?: boolean } | null>(null);
  const [undo, setUndo] = useState<{ kind: "status" | "priority" | "assign" | "delete"; ids: string[]; prevMap: Record<string, string | null>; newValue: string | null } | null>(null);
  const [lastOp, setLastOp] = useState<{ kind: "status" | "priority" | "assign" | "delete"; ids: string[]; value: string | null } | null>(null);
  const noticeTimer = useRef<number | undefined>(undefined);
  const deleteTimer = useRef<number | undefined>(undefined);
  const [noticeVariant, setNoticeVariant] = useState<"soft" | "solid">("soft");
  const [noticePos, setNoticePos] = useState<"top-right" | "top-left" | "bottom-right" | "bottom-left">("top-right");
  const noticeRef = useRef<HTMLDivElement | null>(null);
  const [wipLimits, setWipLimits] = useState<Record<Task["status"], number | null>>({ ToDo: null, InProgress: null, Waiting: null, Completed: null });
  const [wipTarget, setWipTarget] = useState<Task["status"]>("InProgress");
  const [wipValue, setWipValue] = useState<string>("3");
  const [noticeDuration, setNoticeDuration] = useState<number>(5000);
  const [now, setNow] = useState<number>(() => Date.now());
  const noticeInterval = useRef<number | undefined>(undefined);
  const noticeStartAt = useRef<number>(Date.now());
  const deleteStartAt = useRef<number | null>(null);

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
    (async () => {
      const params = new URLSearchParams({ projectId });
      if (priority) params.set("priority", priority);
      if (assignedToId) params.set("assignedToId", assignedToId);
      if (q) params.set("q", q);
      if (mine) params.set("mine", "1");
      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();
      setTasks(data.map((t: any) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, assignedToId: t.assignedToId ?? null, dueDate: t.dueDate ?? null, subtasks: t.subtasks ?? [] })));
    })();
  }, [projectId, priority, assignedToId, q, mine]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/users`);
      const data = await res.json();
      setUsers(data.map((u: any) => ({ id: u.id, email: u.email, name: u.name ?? null })));
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
      updateStateFromColumns(newColumns, destStatus);
      await fetch(`/api/tasks?id=${activeId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: destStatus }) });
      await fetch(`/api/tasks/reorder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, status: destStatus, ids: nextDestIds }) });
      await fetch(`/api/tasks/reorder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, status: sourceStatus, ids: nextSourceIds }) });
    }
  }

  function updateStateFromColumns(cols: Record<Task["status"], string[]>, updateStatus?: Task["status"]) {
    const idToTask = Object.fromEntries(tasks.map((t) => [t.id, t]));
    const next: Task[] = [];
    for (const s of STATUSES) {
      for (const id of cols[s]) next.push({ ...idToTask[id], status: updateStatus ? (id === idToTask[id].id ? updateStatus : idToTask[id].status) : idToTask[id].status });
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
    if (f.dueDate) body.dueDate = f.dueDate;
    await fetch(`/api/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setNewForm((prev) => ({ ...prev, [status]: { ...prev[status], title: "", dueDate: "" } }));
    const res = await fetch(`/api/tasks?projectId=${projectId}`);
    const data = await res.json();
    setTasks(data.map((t: any) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, assignedToId: t.assignedToId ?? null, dueDate: t.dueDate ?? null, subtasks: t.subtasks ?? [] })));
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
                className="h-1 rounded bg-black"
                style={{ width: `${Math.max(0, Math.min(100, Math.round(((now - noticeStartAt.current) / noticeDuration) * 100)))}%` }}
              />
            </div>
            {undo?.kind === "delete" && deleteStartAt.current ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-zinc-600">Geri alma: {Math.max(0, Math.ceil((3000 - (now - deleteStartAt.current)) / 1000))}sn</span>
                <div className="h-1 w-32 rounded bg-neutral-200">
                  <div
                    className="h-1 rounded bg-black"
                    style={{ width: `${Math.max(0, Math.min(100, Math.round(((now - deleteStartAt.current) / 3000) * 100)))}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-zinc-700">Toplam: {total} • Tamamlanan: {done} • %{percent}</div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-48 rounded bg-neutral-200">
            <div className="h-2 rounded bg-black" style={{ width: `${percent}%` }} />
          </div>
          <span className="text-xs text-zinc-600">Seçili: {selected.length}</span>
          <select
            value={String(noticeDuration)}
            onChange={(e) => setNoticeDuration(Number(e.target.value))}
            className="rounded border px-2 py-1 text-xs"
          >
            <option value="3000">Bildirim süresi: 3sn</option>
            <option value="5000">Bildirim süresi: 5sn</option>
            <option value="7000">Bildirim süresi: 7sn</option>
            <option value="10000">Bildirim süresi: 10sn</option>
          </select>
          <select
            value={wipTarget}
            onChange={(e) => setWipTarget(e.target.value as Task["status"]) }
            className="rounded border px-2 py-1 text-xs"
          >
            <option value="ToDo">WIP kolon: To Do</option>
            <option value="InProgress">WIP kolon: In Progress</option>
            <option value="Waiting">WIP kolon: Waiting</option>
            <option value="Completed">WIP kolon: Completed</option>
          </select>
          <input
            type="number"
            min={1}
            value={wipValue}
            onChange={(e) => setWipValue(e.target.value)}
            className="w-16 rounded border px-2 py-1 text-xs"
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
            className="rounded bg-black px-2 py-1 text-xs text-white"
          >WIP ayarla</button>
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
          <select
            value={noticeVariant}
            onChange={(e) => setNoticeVariant(e.target.value as any)}
            className="rounded border px-2 py-1 text-xs"
          >
            <option value="soft">Tema: Soft</option>
            <option value="solid">Tema: Solid</option>
          </select>
          <select
            value={noticePos}
            onChange={(e) => setNoticePos(e.target.value as any)}
            className="rounded border px-2 py-1 text-xs"
          >
            <option value="top-right">Konum: Sağ üst</option>
            <option value="top-left">Konum: Sol üst</option>
            <option value="bottom-right">Konum: Sağ alt</option>
            <option value="bottom-left">Konum: Sol alt</option>
          </select>
          <select
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
          </select>
          <select
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
          </select>
          <select
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
          </select>
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
          >Toplu sil</button>
          <button onClick={exportSelectedCSV} disabled={selected.length === 0} className="rounded border px-2 py-1 text-xs">CSV aktar</button>
          <button onClick={() => setSelected([])} className="rounded border px-2 py-1 text-xs">Seçimi temizle</button>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara" className="rounded border px-3 py-2 text-sm" />
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded border px-3 py-2 text-sm">
          <option value="">Öncelik (tümü)</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
        <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} className="rounded border px-3 py-2 text-sm">
          <option value="">Atanan (tümü)</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Sadece benim görevlerim</label>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
            label={`${STATUS_LABELS[status]} (${items.length})`}
            percent={colPercent}
            completion={colCompletion}
            selectedCount={colSelectedCount}
            onSelectAll={() => setSelected((prev) => Array.from(new Set([...prev, ...items.map((i) => i.id)])))}
            onClearSelection={() => setSelected((prev) => prev.filter((id) => !items.some((i) => i.id === id)))}
            limit={wipLimits[status] ?? null}
            overLimit={wipLimits[status] != null && items.length > (wipLimits[status] as number)}
            count={items.length}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((t) => (
                <KanbanCard
                  key={t.id}
                  id={t.id}
                  title={t.title}
                  priority={t.priority}
                  users={users}
                  assignedToId={t.assignedToId ?? null}
                  dueDate={t.dueDate ?? null}
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
              <input
                value={newForm[status].title}
                onChange={(e) => setNewForm((prev) => ({ ...prev, [status]: { ...prev[status], title: e.target.value } }))}
                placeholder="Yeni görev"
                className="flex-1 rounded border px-3 py-2 text-sm"
              />
              <select value={newForm[status].priority} onChange={(e) => setNewForm((prev) => ({ ...prev, [status]: { ...prev[status], priority: e.target.value } }))} className="rounded border px-2 py-2 text-sm">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
              <select value={newForm[status].assignedToId} onChange={(e) => setNewForm((prev) => ({ ...prev, [status]: { ...prev[status], assignedToId: e.target.value } }))} className="rounded border px-2 py-2 text-sm">
                <option value="">Atanan</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                ))}
              </select>
              <input type="date" value={newForm[status].dueDate} onChange={(e) => setNewForm((prev) => ({ ...prev, [status]: { ...prev[status], dueDate: e.target.value } }))} className="rounded border px-2 py-2 text-sm" />
              <button onClick={() => createTask(status)} className="rounded bg-black px-3 py-2 text-white text-sm">Ekle</button>
            </div>
          </KanbanColumn>
        );})}
      </div>
    </DndContext>
  );
}

function KanbanColumn({ id, label, percent, completion, children, onSelectAll, onClearSelection, selectedCount, limit, overLimit, count }: { id: Task["status"]; label: string; percent?: number; completion?: number; children: React.ReactNode; onSelectAll?: () => void; onClearSelection?: () => void; selectedCount?: number; limit?: number | null; overLimit?: boolean; count?: number }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="rounded border bg-white">
      <div className="border-b px-3 py-2 text-sm font-medium flex items-center justify-between">
        <span>{label}</span>
        <div className="flex items-center gap-3">
          {typeof percent === "number" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Dağ %{percent}</span>
              <div className="h-1 w-16 rounded bg-neutral-200">
                <div className="h-1 rounded bg-black" style={{ width: `${percent}%` }} />
              </div>
            </div>
          ) : null}
          {typeof completion === "number" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Tam %{completion}</span>
              <div className="h-1 w-16 rounded bg-neutral-200">
                <div className="h-1 rounded bg-black" style={{ width: `${completion}%` }} />
              </div>
            </div>
          ) : null}
          {typeof limit === "number" && typeof count === "number" ? (
            <span className={overLimit ? "text-xs text-red-600" : "text-xs text-zinc-500"}>WIP {count}/{limit}</span>
          ) : null}
          {typeof selectedCount === "number" ? (
            <span className="text-[11px] text-zinc-600">Seçili {selectedCount}</span>
          ) : null}
          {onSelectAll ? (
            <button onClick={onSelectAll} className="rounded border px-2 py-1 text-[11px]">Hepsini seç</button>
          ) : null}
          {onClearSelection ? (
            <button onClick={onClearSelection} className="rounded border px-2 py-1 text-[11px]">Temizle</button>
          ) : null}
        </div>
      </div>
      <div ref={setNodeRef} className={`min-h-40 space-y-2 p-3 ${isOver ? "ring-2 ring-black" : ""}`}>{children}</div>
    </div>
  );
}

function KanbanCard({ id, title, priority, users, assignedToId, dueDate, onDelete, onStatusChange, selected, onToggleSelect, status }: { id: string; title: string; priority: Task["priority"]; users: Array<{ id: string; email: string; name: string | null }>; assignedToId: string | null; dueDate: string | null; onDelete: () => void; onStatusChange: (status: Task["status"]) => void; selected: boolean; onToggleSelect: (checked: boolean) => void; status: Task["status"] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id });
  const style: React.CSSProperties = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {};
  const [assignee, setAssignee] = useState<string>(assignedToId ?? "");
  const [due, setDue] = useState<string>(dueDate ? String(dueDate).slice(0, 10) : "");
  useEffect(() => {
    setAssignee(assignedToId ?? "");
  }, [assignedToId]);
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`cursor-move rounded border p-2 text-sm ${isDragging ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onToggleSelect(e.target.checked)}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <Badge className={priority === "Critical" ? "border-red-600 text-red-700" : priority === "High" ? "border-orange-500 text-orange-600" : priority === "Medium" ? "border-blue-500 text-blue-600" : "border-zinc-300 text-zinc-600"}>{priority}</Badge>
          <Badge className={status === "Completed" ? "border-green-600 text-green-700" : status === "InProgress" ? "border-indigo-600 text-indigo-700" : status === "Waiting" ? "border-amber-500 text-amber-600" : "border-zinc-300 text-zinc-600"}>{status}</Badge>
          <span className="font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            defaultValue={priority}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onChange={async (e) => {
              const value = e.target.value;
              await fetch(`/api/tasks?id=${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority: value }) });
            }}
            className="rounded border px-2 py-1 text-xs"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          <select
            defaultValue=""
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onChange={async (e) => {
              const value = e.target.value as Task["status"]; 
              onStatusChange(value);
            }}
            className="rounded border px-2 py-1 text-xs"
          >
            <option value="">Durum</option>
            <option value="ToDo">To Do</option>
            <option value="InProgress">In Progress</option>
            <option value="Waiting">Waiting</option>
            <option value="Completed">Completed</option>
          </select>
          <a
            href={`/tasks/${id}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-blue-600 underline"
          >Görev Aç</a>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={async (e) => {
              e.stopPropagation();
              if (!confirm("Görevi silmek istiyor musunuz?")) return;
              const res = await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
              if (res.ok) onDelete();
            }}
            className="rounded bg-red-600 px-2 py-1 text-xs text-white"
          >Sil</button>
        </div>
      </div>
      <div className="mt-2">
        <select
          value={assignee}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onChange={async (e) => {
            const value = e.target.value;
            setAssignee(value);
            await fetch(`/api/tasks?id=${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignedToId: value || null }) });
          }}
          className="w-full rounded border px-2 py-1 text-xs"
        >
          <option value="">Atanan kişi</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
          ))}
        </select>
      </div>
      <div className="mt-2">
        <input
          type="date"
          value={due}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onChange={async (e) => {
            const value = e.target.value;
            setDue(value);
            await fetch(`/api/tasks?id=${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dueDate: value || null }) });
          }}
          className="w-full rounded border px-2 py-1 text-xs"
        />
      </div>
    </div>
  );
}
