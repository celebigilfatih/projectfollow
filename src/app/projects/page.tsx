import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import Link from "next/link";
import ProjectCreateForm from "@/components/project-create-form";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  const session = await getServerSession(authConfig as any);
  if (!session) return redirect("/login");
  const projects = await prisma.project.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      <h1 className="text-2xl font-semibold">Projeler</h1>
      <ProjectCreateForm />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="rounded border bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{p.title}</span>
              <span className="text-sm text-zinc-500">{p.status}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-600">{p.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
