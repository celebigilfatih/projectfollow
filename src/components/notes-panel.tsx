"use client";
import { useState } from "react";
import RichEditor from "@/components/rich-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotesPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const { data: notes = [], refetch, isLoading } = useQuery({
    queryKey: ["notes", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/notes?projectId=${projectId}`);
      return res.json();
    },
  });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<any>(null);
  const [tags, setTags] = useState<string>("");
  const [editOpen, setEditOpen] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editContent, setEditContent] = useState<any>(null);
  const [editTags, setEditTags] = useState<string>("");
  async function createNote() {
    const payload = { projectId, title, content, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) };
    const optimisticId = "optimistic-" + Math.random().toString(36).slice(2);
    qc.setQueryData(["notes", projectId], (prev: any = []) => [{ id: optimisticId, ...payload }, ...prev]);
    const res = await fetch(`/api/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      const created = await res.json();
      qc.setQueryData(["notes", projectId], (prev: any = []) => [created, ...prev.filter((n: any) => n.id !== optimisticId)]);
      toast.success("Not eklendi");
      setTitle("");
      setContent(null);
      setTags("");
    } else {
      qc.setQueryData(["notes", projectId], (prev: any = []) => prev.filter((n: any) => n.id !== optimisticId));
      toast.error("Not ekleme başarısız");
    }
  }
  async function openEdit(note: any) {
    setEditTitle(note.title ?? "");
    setEditContent(note.content ?? null);
    setEditTags(Array.isArray(note.tags) ? note.tags.join(", ") : "");
    setEditOpen(note.id);
  }
  async function saveEdit() {
    if (!editOpen) return;
    const payload = { title: editTitle, content: editContent, tags: editTags.split(",").map((t) => t.trim()).filter(Boolean) };
    const prev = qc.getQueryData(["notes", projectId]) as any[] | undefined;
    if (prev) qc.setQueryData(["notes", projectId], prev.map((n) => (n.id === editOpen ? { ...n, ...payload } : n)));
    const res = await fetch(`/api/notes?id=${editOpen}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      toast.success("Not güncellendi");
      setEditOpen(null);
    } else {
      toast.error("Not güncelleme başarısız");
      refetch();
    }
  }
  async function removeNote(id: string) {
    if (!confirm("Notu silmek istiyor musunuz?")) return;
    const prev = qc.getQueryData(["notes", projectId]) as any[] | undefined;
    if (prev) qc.setQueryData(["notes", projectId], prev.filter((n) => n.id !== id));
    const res = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Not silindi");
    } else {
      toast.error("Not silme başarısız");
      refetch();
    }
  }
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Yeni Not</CardTitle>
        </CardHeader>
        <div className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Not başlığı" />
          <RichEditor value={content} onChange={setContent} />
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Etiketler (virgülle)" />
          <Button onClick={createNote}>Kaydet</Button>
        </div>
      </Card>
      {isLoading ? <div className="text-sm text-zinc-500">Yükleniyor...</div> : null}
      <ul className="space-y-2">
        {notes.map((n: any) => (
          <li key={n.id}>
            <Card>
              <div className="flex items-center justify-between">
                <div className="font-medium">{n.title}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{Array.isArray(n.tags) ? n.tags.join(", ") : ""}</span>
                  <Button variant="outline" size="sm" onClick={() => openEdit(n)} aria-label="Düzenle" title="Düzenle"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="destructive" size="sm" onClick={() => removeNote(n.id)} aria-label="Sil" title="Sil"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <Dialog open={!!editOpen} onOpenChange={(o) => !o && setEditOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notu Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Not başlığı" />
            <RichEditor value={editContent} onChange={setEditContent} />
            <Input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="Etiketler (virgülle)" />
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditOpen(null)}>Kapat</Button>
              <Button onClick={saveEdit}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
