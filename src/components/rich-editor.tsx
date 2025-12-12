"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";

export default function RichEditor({ value, onChange }: { value?: any; onChange: (doc: any) => void }) {
  const editor = useEditor({
    extensions: [StarterKit, Link, Placeholder.configure({ placeholder: "Not içeriği..." })],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });
  if (!editor) return null;
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button onClick={() => editor.chain().focus().toggleBold().run()} variant="outline">B</Button>
        <Button onClick={() => editor.chain().focus().toggleItalic().run()} variant="outline">I</Button>
        <Button onClick={() => editor.chain().focus().toggleBulletList().run()} variant="outline">•</Button>
      </div>
      <div className="rounded border bg-white p-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
