"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

type Project = { id: string; title: string; description?: string | null; scope?: string | null; status?: string };

export default function ProjectActions({ project }: { project: Project }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [scope, setScope] = useState(project.scope ?? "");
  const [status, setStatus] = useState(project.status ?? "Planned");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects?id=${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, scope, status }),
      });
      if (res.ok) {
        toast.success("Proje güncellendi");
        setEditOpen(false);
        location.reload();
      } else {
        toast.error("Proje güncelleme başarısız");
      }
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects?id=${project.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Proje silindi");
        setDeleteOpen(false);
        location.reload();
      } else {
        toast.error("Proje silme başarısız");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} aria-label="Düzenle" title="Düzenle"><Pencil className="h-4 w-4" /></Button>
      <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} aria-label="Sil" title="Sil"><Trash2 className="h-4 w-4" /></Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proje Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Açıklama" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Textarea placeholder="Kapsam" value={scope} onChange={(e) => setScope(e.target.value)} />
            <select className="w-full rounded border px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Planned">Planned</option>
              <option value="Active">Active</option>
              <option value="Blocked">Blocked</option>
              <option value="Done">Done</option>
            </select>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditOpen(false)}>Kapat</Button>
              <Button onClick={save} disabled={saving}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Projeyi sil</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Bu işlemi onaylıyor musunuz? Bu proje ve ilişkili görevler kalıcı olarak silinecek.</p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Vazgeç</Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleting} aria-label="Sil" title="Sil"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
