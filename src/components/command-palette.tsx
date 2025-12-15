"use client";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TaskStatus, Priority } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const COMMANDS = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Projeler", href: "/projects" },
  { label: "Takvim", href: "/calendar" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => COMMANDS.filter(c => c.label.toLowerCase().includes(q.toLowerCase())), [q]);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim().length < 2) { setTasks([]); setProjects([]); return; }
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set("q", q);
        if (status) qs.set("status", status);
        if (priority) qs.set("priority", priority);
        const [pt, tt] = await Promise.all([
          fetch(`/api/projects?q=${encodeURIComponent(q)}`),
          fetch(`/api/tasks?mine=1&${qs.toString()}`),
        ]);
        const pjson = pt.ok ? await pt.json() : [];
        const tjson = tt.ok ? await tt.json() : [];
        setProjects(Array.isArray(pjson) ? pjson.slice(0, 10) : []);
        setTasks(Array.isArray(tjson) ? tjson.slice(0, 10) : []);
      } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, status, priority]);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Komut Paleti (Ctrl+K)</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Komut Paleti</DialogTitle>
            <Button variant="ghost" onClick={() => setOpen(false)}>Kapat</Button>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Komut ara..." value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="flex items-center gap-2">
              <select className="flex-1 rounded border px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Durum (Tümü)</option>
                {Object.values(TaskStatus).map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
              <select className="flex-1 rounded border px-3 py-2 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">Öncelik (Tümü)</option>
                {Object.values(Priority).map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
            <div className="max-h-80 overflow-auto space-y-2">
              {filtered.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-xs text-zinc-500">Komutlar</div>
                  <ul>
                    {filtered.map((c) => (
                      <li key={c.href} className="border-t first:border-t-0">
                        <Link href={c.href} className="block px-3 py-2 hover:bg-neutral-100" onClick={() => setOpen(false)}>{c.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <div className="px-3 py-1 text-xs text-zinc-500">Projeler</div>
                {loading && <div className="px-3 py-2 text-sm text-zinc-500">Yükleniyor...</div>}
                {!loading && (
                  <ul>
                    {projects.map((p) => (
                      <li key={p.id} className="border-t first:border-t-0">
                        <Link href={`/projects/${p.id}`} className="flex items-center justify-between px-3 py-2 hover:bg-neutral-100" onClick={() => setOpen(false)}>
                          <span className="text-sm">{p.title}</span>
                          <span className="text-xs text-zinc-500">{p.responsible?.name ?? p.responsible?.email ?? ""}</span>
                        </Link>
                      </li>
                    ))}
                    {projects.length === 0 && q.trim().length >= 2 ? <li className="px-3 py-2 text-sm text-zinc-500">Sonuç yok</li> : null}
                  </ul>
                )}
              </div>
              <div>
                <div className="px-3 py-1 text-xs text-zinc-500">Görevler</div>
                {loading && <div className="px-3 py-2 text-sm text-zinc-500">Yükleniyor...</div>}
                {!loading && (
                  <ul>
                    {tasks.map((t) => (
                      <li key={t.id} className="border-t first:border-t-0">
                        <Link href={`/tasks/${t.id}`} className="flex items-center justify-between px-3 py-2 hover:bg-neutral-100" onClick={() => setOpen(false)}>
                          <span className="text-sm">{t.title}</span>
                          <span className="flex items-center gap-2">
                            <Badge className={t.priority === "Critical" ? "bg-red-100 border-red-200 text-red-700" : t.priority === "High" ? "bg-orange-100 border-orange-200 text-orange-700" : t.priority === "Medium" ? "bg-blue-100 border-blue-200 text-blue-700" : "bg-zinc-100 border-zinc-200 text-zinc-700"}>{t.priority}</Badge>
                            <span className="text-xs text-zinc-500">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ""}</span>
                            <span className="text-xs text-zinc-500">{t.assignedTo?.name ?? t.assignedTo?.email ?? t.assignedToId ?? ""}</span>
                            <Badge className={t.status === "Completed" ? "bg-green-100 border-green-200 text-green-700" : t.status === "InProgress" ? "bg-indigo-100 border-indigo-200 text-indigo-700" : t.status === "Waiting" ? "bg-amber-100 border-amber-200 text-amber-700" : "bg-zinc-100 border-zinc-200 text-zinc-700"}>{t.status}</Badge>
                          </span>
                        </Link>
                      </li>
                    ))}
                    {tasks.length === 0 && q.trim().length >= 2 ? <li className="px-3 py-2 text-sm text-zinc-500">Sonuç yok</li> : null}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
