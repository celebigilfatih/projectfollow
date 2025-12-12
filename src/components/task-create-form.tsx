"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TaskCreateForm({ projectId }: { projectId: string }) {
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  async function create() {
    setCreating(true);
    const res = await fetch("/api/tasks", { method: "POST", body: JSON.stringify({ title, projectId }) });
    setCreating(false);
    if (res.ok) location.reload();
  }
  return (
    <div className="flex items-center gap-2">
      <Input placeholder="Görev başlığı" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Button onClick={create} disabled={creating}>Ekle</Button>
    </div>
  );
}
