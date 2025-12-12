"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ProjectCreateForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("");
  const [creating, setCreating] = useState(false);

  async function create() {
    setCreating(true);
    const res = await fetch("/api/projects", { method: "POST", body: JSON.stringify({ title, description, scope }) });
    setCreating(false);
    if (res.ok) {
      setTitle("");
      setDescription("");
      setScope("");
      location.reload();
    }
  }

  return (
    <div className="rounded border bg-white p-4 space-y-2">
      <div className="font-medium">Yeni Proje</div>
      <Input placeholder="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="Açıklama" value={description} onChange={(e) => setDescription(e.target.value)} />
      <Textarea placeholder="Kapsam" value={scope} onChange={(e) => setScope(e.target.value)} />
      <Button onClick={create} disabled={creating}>Oluştur</Button>
    </div>
  );
}
