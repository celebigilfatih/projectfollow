"use client";
import { useEffect, useMemo, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type Project = { id: string; title: string; status: string; updatedAt: string };

export default function ProjectsTable({ projects }: { projects: Project[] }) {
  const [columns, setColumns] = useState<{ title: boolean; status: boolean; updatedAt: boolean; actions: boolean }>({ title: true, status: true, updatedAt: true, actions: true });
  const visibleCount = useMemo(() => Object.values(columns).filter(Boolean).length, [columns]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pf.projects.columns");
      if (raw) setColumns(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("pf.projects.columns", JSON.stringify(columns)); } catch {}
  }, [columns]);
  return (
    <div>
      <div className="mb-2 flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">Sütunlar ({visibleCount})</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setColumns((c) => ({ ...c, title: !c.title }))}>{columns.title ? "✔" : ""} Başlık</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColumns((c) => ({ ...c, status: !c.status }))}>{columns.status ? "✔" : ""} Durum</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColumns((c) => ({ ...c, updatedAt: !c.updatedAt }))}>{columns.updatedAt ? "✔" : ""} Güncellenme</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColumns((c) => ({ ...c, actions: !c.actions }))}>{columns.actions ? "✔" : ""} İşlem</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColumns({ title: true, status: true, updatedAt: true, actions: true })}>Hepsi</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColumns({ title: false, status: false, updatedAt: false, actions: false })}>Temizle</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColumns({ title: true, status: true, updatedAt: true, actions: true })}>Varsayılan</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
              {columns.title && <th className="px-3 py-2">Başlık</th>}
              {columns.status && <th className="px-3 py-2">Durum</th>}
              {columns.updatedAt && <th className="px-3 py-2">Güncellenme</th>}
              {columns.actions && <th className="px-3 py-2">İşlem</th>}
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-t">
                {columns.title && <td className="px-3 py-2">{p.title}</td>}
                {columns.status && <td className="px-3 py-2 text-zinc-600">{p.status}</td>}
                {columns.updatedAt && <td className="px-3 py-2 text-zinc-600">{new Date(p.updatedAt).toLocaleString()}</td>}
                {columns.actions && <td className="px-3 py-2"><a href={`/projects/${p.id}`} className="underline">Detay</a></td>}
              </tr>
            ))}
            {projects.length === 0 ? (
              <tr><td className="px-3 py-4 text-zinc-500" colSpan={visibleCount || 1}>Proje bulunamadı</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
