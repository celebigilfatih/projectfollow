"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type Task = { id: string; title: string; status: string; priority: string; dueDate?: string | Date | null; taskGroup?: { name?: string | null } | null };

export default function TaskListModal({ projectId, title, params, trigger }: { projectId: string; title: string; params: Record<string, string>; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!open) return;
    const run = async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ projectId, ...params });
        const res = await fetch(`/api/tasks?${qs.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setTasks(Array.isArray(data) ? data : []);
        }
      } catch {}
      setLoading(false);
    };
    run();
  }, [open, projectId, JSON.stringify(params)]);

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </div>
      <Dialog open={open} onOpenChange={setOpen} contentClassName="max-w-2xl">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <Button variant="ghost" onClick={() => setOpen(false)}>Kapat</Button>
          </DialogHeader>
          <div className="space-y-2">
            {loading ? (
              <div className="px-3 py-2 text-sm text-zinc-500">Yükleniyor…</div>
            ) : tasks.length > 0 ? (
              <ul className="divide-y">
                {tasks.map((t) => (
                  <li key={t.id} className="px-3 py-2 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <Link href={`/tasks/${t.id}`} className="text-sm hover:underline break-words whitespace-normal">{t.title}</Link>
                      <div className="mt-1 text-xs text-zinc-600 break-words whitespace-normal">{(t as any).taskGroup?.name ?? "-"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={t.status === "Completed" ? "bg-green-600 border-green-700 text-white" : t.status === "InProgress" ? "bg-indigo-600 border-indigo-700 text-white" : t.status === "Waiting" ? "bg-amber-500 border-amber-600 text-white" : "bg-zinc-700 border-zinc-800 text-white"}>{t.status === "Completed" ? "Tamamlandı" : t.status === "InProgress" ? "Devam" : t.status === "Waiting" ? "Beklemede" : "Yapılacak"}</Badge>
                      <Badge className={t.priority === "Critical" ? "bg-red-600 border-red-700 text-white" : t.priority === "High" ? "bg-amber-500 border-amber-600 text-white" : t.priority === "Medium" ? "bg-zinc-600 border-zinc-700 text-white" : "bg-neutral-400 border-neutral-500 text-white"}>{t.priority}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-2 text-sm text-zinc-500">Sonuç yok</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

