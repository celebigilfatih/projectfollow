"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default function TaskDetailClient({ task, users, teams }: { task: any; users: Array<{ id: string; email: string; name: string | null }>; teams: Array<{ id: string; name: string; managerName?: string | null }> }) {
  const router = useRouter();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assignedToId, setAssignedToId] = useState<string | undefined>(task.assignedToId ?? undefined);
  const [assignedTeamId, setAssignedTeamId] = useState<string | undefined>(task.assignedTeamId ?? undefined);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(Array.isArray(task.assignees) ? task.assignees.map((a: any) => a.userId) : []);
  const [taskGroupId, setTaskGroupId] = useState<string | undefined>(task.taskGroupId ?? undefined);
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/task-groups?projectId=${task.projectId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (active) setGroups(Array.isArray(data) ? data : []);
      } catch {}
    })();
    return () => { active = false; };
  }, [task.projectId]);

  async function save() {
    try {
      setSaving(true);
      const res = await fetch(`/api/tasks?id=${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, status, priority, assignedToId, assignedTeamId, assigneeIds, taskGroupId }) });
      if (!res.ok) throw new Error(String(res.status));
      toast.success("Görev güncellendi");
      router.refresh();
    } catch {
      toast.error("Kaydetme başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function addSubtask() {
    if (!subtaskTitle.trim()) return;
    try {
      const res = await fetch(`/api/subtasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: task.id, title: subtaskTitle }) });
      if (!res.ok) throw new Error(String(res.status));
      toast.success("Alt görev eklendi");
      setSubtaskTitle("");
      router.refresh();
    } catch {
      toast.error("Alt görev eklenemedi");
    }
  }

  async function toggleSubtask(id: string, completed: boolean) {
    try {
      const res = await fetch(`/api/subtasks?id=${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed }) });
      if (!res.ok) throw new Error(String(res.status));
      toast.success("Alt görev güncellendi");
      router.refresh();
    } catch {
      toast.error("Alt görev güncellenemedi");
    }
  }

  async function addComment() {
    if (!comment.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/comment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: comment }) });
      if (!res.ok) throw new Error(String(res.status));
      toast.success("Yorum eklendi");
      setComment("");
      router.refresh();
    } catch {
      toast.error("Yorum eklenemedi");
    }
  }

  async function uploadAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("taskId", task.id);
      const res = await fetch(`/api/attachments`, { method: "POST", body: form });
      if (!res.ok) throw new Error(String(res.status));
      toast.success("Dosya yüklendi");
      e.target.value = "";
      router.refresh();
    } catch {
      toast.error("Dosya yüklenemedi");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Görev Detayı</CardTitle>
        </CardHeader>
        <div className="space-y-2">
          <div>
            <div className="text-xs text-zinc-600 mb-1">Başlık</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Görev başlığı" />
          </div>
          <div>
            <div className="text-xs text-zinc-600 mb-1">Açıklama</div>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Açıklama" />
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
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
            <div>
              <div className="text-xs text-zinc-600 mb-1">Atanan Kullanıcı</div>
              <Select value={assignedToId ?? ""} onChange={(e) => setAssignedToId(e.target.value || undefined)}>
                <option value="">Atanmadı</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                ))}
              </Select>
            </div>
            <div>
              <div className="text-xs text-zinc-600 mb-1">Atanan Takım</div>
              <Select value={assignedTeamId ?? ""} onChange={(e) => setAssignedTeamId(e.target.value || undefined)}>
                <option value="">Takım atanmadı</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{`${t.name}${t.managerName ? ` – Yönetici: ${t.managerName}` : ""}`}</option>
                ))}
              </Select>
              {assignedTeamId ? (
                <div className="mt-1 text-xs text-zinc-600">
                  {(() => { const tm = teams.find((x) => x.id === assignedTeamId); return tm?.managerName ? `Yönetici: ${tm.managerName}` : ""; })()}
                </div>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-zinc-600 mb-1">Grup</div>
              <Select value={taskGroupId ?? ""} onChange={(e) => setTaskGroupId(e.target.value || undefined)}>
                <option value="">Grup seçilmedi</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </Select>
            </div>
          </div>
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
          <div className="flex items-end justify-end">
            <Button onClick={save} disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Checklists</CardTitle>
        </CardHeader>
        <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input placeholder="Alt görev" value={subtaskTitle} onChange={(e) => setSubtaskTitle(e.target.value)} />
          <Button onClick={addSubtask}>Ekle</Button>
        </div>
        <ul className="space-y-2">
          {task.subtasks.map((s: any) => (
            <li key={s.id} className="flex items-center gap-2">
              <input type="checkbox" defaultChecked={s.completed} onChange={(e) => toggleSubtask(s.id, e.target.checked)} />
              <span>{s.title}</span>
            </li>
          ))}
        </ul>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Yorumlar</CardTitle>
        </CardHeader>
        <div className="space-y-2">
        <Textarea placeholder="Yorum" value={comment} onChange={(e) => setComment(e.target.value)} />
        <Button onClick={addComment}>Gönder</Button>
        <ul className="space-y-2">
          {task.comments.map((c: any) => (
            <li key={c.id} className="rounded border p-2">
              <div className="text-sm">{c.content}</div>
              <div className="text-xs text-zinc-500">{c.user?.email}</div>
            </li>
          ))}
        </ul>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Dosya yükleme</CardTitle>
        </CardHeader>
        <div className="space-y-2">
        <input type="file" onChange={uploadAttachment} />
        <ul className="space-y-2">
          {task.attachments.map((a: any) => (
            <li key={a.id} className="flex items-center justify-between rounded border p-2">
              <a href={a.url} target="_blank" rel="noreferrer" className="text-sm">{a.fileName}</a>
              <span className="text-xs text-zinc-500">{a.mimeType}</span>
            </li>
          ))}
        </ul>
        </div>
      </Card>
    </div>
  );
}
