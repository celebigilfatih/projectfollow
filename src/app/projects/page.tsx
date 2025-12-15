import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { FolderKanban, ListTodo, CheckCircle2 } from "lucide-react";
import ProjectActions from "@/components/project-actions";
import ProjectCreateForm from "@/components/project-create-form";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  const session = await getServerSession(authConfig as any);
  if (!session) return redirect("/login");
  const [projects, totalProjects, totalTasks, completedTasks] = await Promise.all([
    prisma.project.findMany({ include: { tasks: true }, orderBy: { updatedAt: "desc" } }),
    prisma.project.count(),
    prisma.task.count(),
    prisma.task.count({ where: { status: "Completed" as any } }),
  ]);
  const completedPct = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  return (
    <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 lg:py-6 space-y-6">
      <h1 className="text-2xl font-semibold">Projeler</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="transition duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">Toplam Proje</div>
            <FolderKanban className="h-5 w-5 text-neutral-600" />
          </div>
          <div className="mt-1 text-2xl font-semibold">{totalProjects}</div>
        </Card>
        <Card className="transition duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">Toplam Görev</div>
            <ListTodo className="h-5 w-5 text-neutral-600" />
          </div>
          <div className="mt-1 text-2xl font-semibold">{totalTasks}</div>
        </Card>
        <Card className="transition duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">Tamamlanan Görev %</div>
            <CheckCircle2 className="h-5 w-5 text-neutral-600" />
          </div>
          <div className="mt-1 text-2xl font-semibold">{completedPct}%</div>
        </Card>
      </div>

      <ProjectCreateForm />

      <Card className="p-2 sm:p-4 lg:p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-600">
                <th className="px-2 sm:px-4 lg:px-6 py-2">Proje</th>
                <th className="px-2 sm:px-4 lg:px-6 py-2">Durum</th>
                <th className="px-2 sm:px-4 lg:px-6 py-2">Görevler</th>
                <th className="px-2 sm:px-4 lg:px-6 py-2">Güncellendi</th>
                <th className="px-2 sm:px-4 lg:px-6 py-2">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, idx) => (
                <tr key={p.id} className={`border-t ${idx % 2 === 0 ? "bg-white" : "bg-neutral-50"} hover:bg-neutral-100 transition-colors`}>
                  <td className="px-2 sm:px-4 lg:px-6 py-2">
                    <Link href={`/projects/${p.id}`} className="font-medium hover:underline">{p.title}</Link>
                    {p.description ? (
                      <div className="mt-1 text-xs text-zinc-600 line-clamp-1">{p.description}</div>
                    ) : null}
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-2 text-xs text-zinc-700">{p.status}</td>
                  <td className="px-2 sm:px-4 lg:px-6 py-2 text-xs text-zinc-700">{p.tasks.length}</td>
                  <td className="px-2 sm:px-4 lg:px-6 py-2 text-xs text-zinc-700">{new Date(p.updatedAt).toLocaleString()}</td>
                  <td className="px-2 sm:px-4 lg:px-6 py-2">
                    <ProjectActions project={{ id: p.id, title: p.title, description: p.description, scope: p.scope, status: p.status }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
