"use client";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TaskCreateForm from "@/components/task-create-form";

type Project = { id: string; title: string };

export default function QuickTaskModal({
  projects,
  projectId,
  users = [],
  teams = [],
  label = "Görev Ekle",
}: {
  projects?: Project[];
  projectId?: string;
  users?: Array<{ id: string; email: string; name: string | null }>;
  teams?: Array<{ id: string; name: string; managerName?: string | null }>;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const effectiveProjectId = useMemo(() => {
    if (projectId) return projectId;
    return projects && projects[0] ? projects[0].id : "";
  }, [projectId, projects]);
  const [selectedProjectId, setSelectedProjectId] = useState(effectiveProjectId);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>{label}</Button>
      <Dialog open={open} onOpenChange={setOpen} contentClassName="max-w-2xl">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görev Oluştur</DialogTitle>
            <Button variant="ghost" onClick={() => setOpen(false)}>Kapat</Button>
          </DialogHeader>
          <div className="space-y-3">
            {!projectId && projects && projects.length > 0 ? (
              <select
                className="w-full rounded border px-3 py-2 text-sm"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                {projects.map((p) => (<option key={p.id} value={p.id}>{p.title}</option>))}
              </select>
            ) : null}
            {(projectId ?? selectedProjectId) ? (
              <TaskCreateForm projectId={projectId ?? selectedProjectId} users={users} teams={teams} defaultShowAdvanced={true} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
