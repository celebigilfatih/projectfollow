"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

export default function TaskDetailClient({ task, users, teams }: { task: any; users: Array<{ id: string; email: string; name: string | null }>; teams: Array<{ id: string; name: string }> }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assignedToId, setAssignedToId] = useState<string | undefined>(task.assignedToId ?? undefined);
  const [assignedTeamId, setAssignedTeamId] = useState<string | undefined>(task.assignedTeamId ?? undefined);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(Array.isArray(task.assignees) ? task.assignees.map((a: any) => a.userId) : []);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [comment, setComment] = useState("");

  async function save() {
    await fetch(`/api/tasks?id=${task.id}`, { method: "PATCH", body: JSON.stringify({ title, description, status, priority, assignedToId, assignedTeamId, assigneeIds }) });
    location.reload();
  }

  async function addSubtask() {
    if (!subtaskTitle) return;
    await fetch(`/api/subtasks`, { method: "POST", body: JSON.stringify({ taskId: task.id, title: subtaskTitle }) });
    location.reload();
  }

  async function toggleSubtask(id: string, completed: boolean) {
    await fetch(`/api/subtasks?id=${id}`, { method: "PATCH", body: JSON.stringify({ completed }) });
  }

  async function addComment() {
    if (!comment) return;
    await fetch(`/api/tasks/${task.id}/comment`, { method: "POST", body: JSON.stringify({ content: comment }) });
    location.reload();
  }

  async function uploadAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("taskId", task.id);
    await fetch(`/api/attachments`, { method: "POST", body: form });
    location.reload();
  }

  return (
    <div className="space-y-4">
      <div className="rounded border bg-white p-4 space-y-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ToDo">To Do</option>
            <option value="InProgress">In Progress</option>
            <option value="Waiting">Waiting</option>
            <option value="Completed">Completed</option>
          </Select>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </Select>
          <Select value={assignedToId ?? ""} onChange={(e) => setAssignedToId(e.target.value || undefined)}>
            <option value="">Atanmadı</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
            ))}
          </Select>
          <Select value={assignedTeamId ?? ""} onChange={(e) => setAssignedTeamId(e.target.value || undefined)}>
            <option value="">Takım atanmadı</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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
            <Button onClick={save}>Kaydet</Button>
          </div>
        </div>
        
      </div>
      <div className="rounded border bg-white p-4 space-y-2">
        <div className="font-medium">Checklists</div>
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
      <div className="rounded border bg-white p-4 space-y-2">
        <div className="font-medium">Yorumlar</div>
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
      <div className="rounded border bg-white p-4 space-y-2">
        <div className="font-medium">Dosya yükleme</div>
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
    </div>
  );
}
