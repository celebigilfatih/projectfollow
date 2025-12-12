"use client";
import { useState } from "react";
import RichEditor from "@/components/rich-editor";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

export default function NotesPanel({ projectId }: { projectId: string }) {
  const { data: notes = [], refetch } = useQuery({
    queryKey: ["notes", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/notes?projectId=${projectId}`);
      return res.json();
    },
  });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<any>(null);
  const [tags, setTags] = useState<string>("");
  async function createNote() {
    const res = await fetch(`/api/notes`, { method: "POST", body: JSON.stringify({ projectId, title, content, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) }) });
    if (res.ok) {
      setTitle("");
      setContent(null);
      setTags("");
      refetch();
    }
  }
  return (
    <div className="space-y-4">
      <div className="rounded border bg-white p-4 space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Not başlığı" className="w-full rounded border px-3 py-2 text-sm" />
        <RichEditor value={content} onChange={setContent} />
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Etiketler (virgülle)" className="w-full rounded border px-3 py-2 text-sm" />
        <Button onClick={createNote}>Kaydet</Button>
      </div>
      <ul className="space-y-2">
        {notes.map((n: { id: string; title?: string; tags?: string[] }) => (
          <li key={n.id} className="rounded border bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{n.title}</div>
              <div className="text-xs text-zinc-500">{(n.tags || []).join(", ")}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
