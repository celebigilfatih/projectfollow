"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, Flag, User, Calendar, Trash2, MoreVertical } from "lucide-react";

type UserItem = { id: string; email: string; name: string | null };
type TaskInfo = { id: string; status: string; priority: string; assignedToId?: string | null; dueDate?: string | Date | null };

export default function TaskRowActions({ task, users }: { task: TaskInfo; users: UserItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assignedToId, setAssignedToId] = useState<string>(task.assignedToId ?? "");
  const [due, setDue] = useState<string>(() => {
    try {
      if (!task.dueDate) return "";
      const d = new Date(String(task.dueDate));
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    } catch {
      return "";
    }
  });

  async function patch(data: Record<string, any>) {
    await fetch(`/api/tasks?id=${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    router.refresh();
  }

  async function remove() {
    await fetch(`/api/tasks?id=${task.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function saveAll() {
    const payload: Record<string, any> = {
      status,
      priority,
      assignedToId: assignedToId || null,
      dueDate: due,
    };
    await patch(payload);
    setOpen(false);
  }

  return (
    <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm"><MoreVertical className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuPrimitive.Content
        className="z-50 min-w-[12rem] rounded-md border border-[var(--border)] bg-white p-2 shadow-md"
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-2 py-1">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border px-2 py-1 text-xs">
            <option value="ToDo">Yapılacak</option>
            <option value="InProgress">Devam Ediyor</option>
            <option value="Waiting">Beklemede</option>
            <option value="Completed">Tamamlandı</option>
          </select>
          <Button onClick={() => patch({ status })} variant="outline" size="sm" className="text-[10px] p-1"><CheckCircle2 className="h-3 w-3" /></Button>
        </div>
        <div className="flex items-center gap-2 py-1">
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded border px-2 py-1 text-xs">
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          <Button onClick={() => patch({ priority })} variant="outline" size="sm" className="text-[10px] p-1"><Flag className="h-3 w-3" /></Button>
        </div>
        <div className="flex items-center gap-2 py-1">
          <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} className="rounded border px-2 py-1 text-xs">
            <option value="">Atanmadı</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
            ))}
          </select>
          <Button onClick={() => patch({ assignedToId: assignedToId || null })} variant="outline" size="sm" className="text-[10px] p-1"><User className="h-3 w-3" /></Button>
        </div>
        <div className="flex items-center gap-2 py-1">
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="rounded border px-2 py-1 text-xs" />
          <Button onClick={() => patch({ dueDate: due })} variant="outline" size="sm" className="text-[10px] p-1"><Calendar className="h-3 w-3" /></Button>
        </div>
        <div className="flex items-center gap-2 py-1">
          <Button onClick={remove} variant="destructive" size="sm" className="text-[10px] p-1"><Trash2 className="h-3 w-3" /></Button>
          <Link href={`/tasks/${task.id}`} className="text-sm">Detaya git</Link>
          <Button onClick={saveAll} size="sm" className="ml-auto">Kaydet</Button>
          <Button onClick={() => setOpen(false)} variant="ghost" size="sm" className="text-[10px] px-2">İptal</Button>
        </div>
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Root>
  );
}
