"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function TaskCreateForm({ projectId, users = [], teams = [], defaultShowAdvanced }: { projectId: string; users?: Array<{ id: string; email: string; name: string | null }>; teams?: Array<{ id: string; name: string; managerName?: string | null }>; defaultShowAdvanced?: boolean }) {
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(!!defaultShowAdvanced);
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [assignedTeamId, setAssignedTeamId] = useState<string>("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [status, setStatus] = useState<string>("ToDo");
  const [priority, setPriority] = useState<string>("Medium");
  const [description, setDescription] = useState<string>("");
  const [taskGroupId, setTaskGroupId] = useState<string>("");
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [newGroupName, setNewGroupName] = useState<string>("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/task-groups?projectId=${projectId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (active) setGroups(Array.isArray(data) ? data : []);
      } catch {}
    })();
    return () => { active = false; };
  }, [projectId]);

  async function createGroup() {
    if (!newGroupName.trim()) return;
    try {
      setCreatingGroup(true);
      const res = await fetch("/api/task-groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, name: newGroupName.trim() }) });
      setCreatingGroup(false);
      if (!res.ok) {
        toast.error("Grup oluşturulamadı");
        return;
      }
      const created = await res.json();
      setGroups((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setTaskGroupId(created.id);
      setNewGroupName("");
      toast.success("Grup oluşturuldu");
    } catch {
      setCreatingGroup(false);
      toast.error("Grup oluşturulamadı");
    }
  }

  async function create() {
    if (!title.trim()) return;
    setCreating(true);
    const body: any = { title: title.trim(), projectId, status, priority };
    if (assignedToId) body.assignedToId = assignedToId;
    if (assignedTeamId) body.assignedTeamId = assignedTeamId;
    if (assigneeIds.length > 0) body.assigneeIds = assigneeIds;
    if (dueDate) body.dueDate = dueDate;
    if (startDate) body.startDate = startDate;
    if (description.trim()) body.description = description.trim();
    if (taskGroupId) body.taskGroupId = taskGroupId;
    const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setCreating(false);
    if (res.ok) {
      toast.success("Görev oluşturuldu");
      setTitle(""); setAssignedToId(""); setAssignedTeamId(""); setAssigneeIds([]); setDueDate(""); setStartDate(""); setDescription(""); setStatus("ToDo"); setPriority("Medium"); setTaskGroupId("");
      location.reload();
    } else {
      toast.error("Görev oluşturulamadı");
    }
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Görev başlığı"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") create(); if (e.key === "Enter" && e.ctrlKey) create(); }}
          className="flex-1"
        />
        <Button size="sm" onClick={create} disabled={creating || !title.trim()}>Ekle</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdvanced((v) => !v)}>
          {showAdvanced ? "Gizle" : "Detaylar"}
        </Button>
      </div>
      {showAdvanced ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <div className="text-xs text-zinc-600 mb-1">Durum</div>
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ToDo">Yapılacak</option>
                <option value="InProgress">Devam Ediyor</option>
                <option value="Waiting">Beklemede</option>
                <option value="Completed">Tamamlandı</option>
              </Select>
            </div>
            <div>
              <div className="text-xs text-zinc-600 mb-1">Öncelik</div>
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <div className="text-xs text-zinc-600 mb-1">Grup</div>
              <Select value={taskGroupId} onChange={(e) => setTaskGroupId(e.target.value)}>
                <option value="">Grup seçilmedi</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <div className="text-xs text-zinc-600 mb-1">Yeni grup</div>
              <div className="flex items-center gap-2">
                <Input placeholder="FAZ-1" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
                <Button size="sm" onClick={createGroup} disabled={creatingGroup || !newGroupName.trim()}>Oluştur</Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {users.length > 0 ? (
              <div>
                <div className="text-xs text-zinc-600 mb-1">Kişi</div>
                <Select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
                  <option value="">Kişi atanmadı</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                  ))}
                </Select>
              </div>
            ) : null}
            {teams.length > 0 ? (
              <div>
                <div className="text-xs text-zinc-600 mb-1">Takım</div>
                <Select value={assignedTeamId} onChange={(e) => setAssignedTeamId(e.target.value)}>
                  <option value="">Takım atanmadı</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{`${t.name}${t.managerName ? ` – Yönetici: ${t.managerName}` : ""}`}</option>
                  ))}
                </Select>
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <div className="text-xs text-zinc-600 mb-1">Başlangıç</div>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <div className="text-xs text-zinc-600 mb-1">Son tarih</div>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          {users.length > 0 ? (
            <div>
              <div className="text-xs text-zinc-600 mb-1">Çoklu kişi atama</div>
              <Select
                multiple
                value={assigneeIds}
                onChange={(e) => {
                  const options = Array.from((e.target as HTMLSelectElement).selectedOptions).map((o) => o.value);
                  setAssigneeIds(options);
                }}
                className="h-24 w-full"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                ))}
              </Select>
            </div>
          ) : null}
          <div>
            <div className="text-xs text-zinc-600 mb-1">Açıklama</div>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kısa açıklama" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
