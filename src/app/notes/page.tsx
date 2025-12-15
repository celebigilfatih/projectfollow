import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { redirect } from "next/navigation";
import NotesPanel from "@/components/notes-panel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function NotesPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const session = await getServerSession(authConfig as any);
  if (!session) return redirect("/login");
  const params = searchParams ?? {};
  const projectId = params.projectId || undefined;
  const projects = await prisma.project.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      <h1 className="text-2xl font-semibold">Notlar</h1>
      <Card>
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
          action={async (formData: FormData) => {
            "use server";
            const session = await getServerSession(authConfig as any);
            if (!session) return redirect("/login");
            const p = String(formData.get("projectId") || "");
            const qs = new URLSearchParams();
            if (p) qs.set("projectId", p);
            redirect(`/notes?${qs.toString()}`);
          }}
        >
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Proje</label>
            <select name="projectId" defaultValue={projectId ?? ""} className="w-full rounded border px-3 py-2 text-sm">
              <option value="">Seçiniz</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="outline" size="sm">Göster</Button>
          </div>
        </form>
      </Card>
      {projectId ? (
        <NotesPanel projectId={projectId} />
      ) : (
        <div className="text-sm text-zinc-600">Notları görmek için bir proje seçiniz.</div>
      )}
    </div>
  );
}
