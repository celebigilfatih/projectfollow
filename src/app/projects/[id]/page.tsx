import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import TaskCreateForm from "@/components/task-create-form";
import NotesPanel from "@/components/notes-panel";
import KanbanBoard from "@/components/kanban-board";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authConfig as any);
  if (!session) return redirect("/login");
  const project = await prisma.project.findUnique({ where: { id: params.id }, include: { tasks: true } });
  if (!project) return notFound();

  const tabs = [
    {
      id: "overview",
      label: "Genel",
      content: (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded border bg-white p-4">
            <div className="font-medium">Proje detay</div>
            <div className="mt-2 text-sm text-zinc-700">{project.description}</div>
            <div className="mt-2 text-sm text-zinc-700">Durum: {project.status}</div>
          </div>
          <div className="md:col-span-2 rounded border bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Görevler</div>
              <TaskCreateForm projectId={project.id} />
            </div>
            <ul className="mt-3 space-y-2">
              {project.tasks.map((t) => (
                <li key={t.id} className="flex justify-between rounded border p-2">
                  <a href={`/tasks/${t.id}`}>{t.title}</a>
                  <span className="text-sm text-zinc-500">{t.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "notes",
      label: "Notlar",
      content: <NotesPanel projectId={project.id} />,
    },
    {
      id: "kanban",
      label: "Kanban",
      content: <KanbanBoard projectId={project.id} />,
    },
    {
      id: "timeline",
      label: "Timeline",
      content: <Timeline projectId={project.id} />,
    },
    {
      id: "domain",
      label: "Domain Migration",
      content: <DomainMigrationTab projectId={project.id} project={project} />,
    },
    {
      id: "exchange",
      label: "Exchange Migration",
      content: <ExchangeMigrationTab projectId={project.id} project={project} />,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <h1 className="mb-4 text-2xl font-semibold">{project.title}</h1>
      <Tabs tabs={tabs} />
    </div>
  );
}

async function Timeline({ projectId }: { projectId: string }) {
  const tasks = await prisma.task.findMany({ where: { projectId }, orderBy: { startDate: "asc" } });
  const min = tasks.reduce<Date | null>((acc, t) => (!acc || (t.startDate && t.startDate < acc) ? t.startDate ?? acc : acc), null) ?? new Date();
  return (
    <div className="space-y-2">
      {tasks.map((t) => {
        const start = t.startDate ?? min;
        const end = t.dueDate ?? start;
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        return (
          <div key={t.id} className="flex items-center gap-2">
            <span className="w-48 text-sm">{t.title}</span>
            <div className="h-3 flex-1 rounded bg-neutral-100">
              <div className="h-3 rounded bg-black" style={{ width: `${Math.min(100, days * 5)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DomainMigrationTab({ projectId, project }: { projectId: string; project: any }) {
  return <ProjectExtraFields projectId={projectId} fields={{
    domainNewOUPlan: project.domainNewOUPlan ?? "",
    domainUserMigration: project.domainUserMigration ?? "",
    domainGPOPlan: project.domainGPOPlan ?? "",
  }} />;
}

function ExchangeMigrationTab({ projectId, project }: { projectId: string; project: any }) {
  return <ProjectExtraFields projectId={projectId} fields={{
    exchMailboxPlan: project.exchMailboxPlan ?? "",
    exchAutodiscover: project.exchAutodiscover ?? "",
    exchDatabaseDAG: project.exchDatabaseDAG ?? "",
    exchHybridNotes: project.exchHybridNotes ?? "",
  }} />;
}

function ProjectExtraFields({ projectId, fields }: { projectId: string; fields: Record<string, string> }) {
  return (
    <form
      className="space-y-2"
      action={async (formData: FormData) => {
        "use server";
        const data: Record<string, string> = {};
        for (const [k, v] of formData.entries()) data[k] = String(v);
        await prisma.project.update({ where: { id: projectId }, data });
      }}
    >
      {Object.entries(fields).map(([key, value]) => (
        <div key={key} className="space-y-1">
          <label className="text-sm font-medium">{key}</label>
          <textarea name={key} defaultValue={value} className="w-full rounded border px-3 py-2 text-sm" />
        </div>
      ))}
      <button type="submit" className="rounded bg-black px-3 py-2 text-white">Kaydet</button>
    </form>
  );
}
