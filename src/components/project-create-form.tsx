"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ProjectCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("");
  const [creating, setCreating] = useState(false);

  async function create() {
    setCreating(true);
    try {
      const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, scope }) });
      if (res.ok) {
        toast.success("Proje oluşturuldu");
        setTitle("");
        setDescription("");
        setScope("");
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Proje oluşturma başarısız");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex items-center justify-end">
      <Button size="sm" onClick={() => setOpen(true)}>Yeni Proje</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-neutral-200 px-4 py-2">
            <DialogTitle>Yeni Proje</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 px-4 py-3">
            <div>
              <div className="mb-1 text-xs text-zinc-600">Başlık</div>
              <Input placeholder="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <div className="mb-1 text-xs text-zinc-600">Açıklama</div>
              <Textarea placeholder="Açıklama" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <div className="mb-1 text-xs text-zinc-600">Kapsam</div>
              <Textarea placeholder="Kapsam" value={scope} onChange={(e) => setScope(e.target.value)} />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Kapat</Button>
              <Button onClick={create} disabled={creating}>{creating ? "Oluşturuluyor..." : "Oluştur"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
