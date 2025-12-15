import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RBAC } from "@/lib/rbac";

export default async function TeamsPage() {
  const session = await getServerSession(authConfig as any);
  if (!session) return redirect("/login");
  const teams = await prisma.team.findMany({ include: { members: { include: { user: true } } }, orderBy: { updatedAt: "desc" } });
  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Takımlar</h1>
        <Link href="#create" className="rounded border px-3 py-1 text-sm">Takım Ekle</Link>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {teams.map((t) => (
          <Link key={t.id} href={`/teams/${t.id}`} className="rounded border bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{t.name}</span>
              <span className="text-sm text-zinc-500">Üye {t.members.length}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-600">{t.description}</p>
          </Link>
        ))}
      </div>
      <CreateTeamForm />
    </div>
  );
}

function CreateTeamForm() {
  return (
    <form
      id="create"
      className="rounded border bg-white p-4 space-y-2"
      action={async (formData: FormData) => {
        "use server";
        const name = String(formData.get("name") || "");
        const description = String(formData.get("description") || "");
        if (!name) return;
        const session = await getServerSession(authConfig as any);
        if (!session) return;
        const roles = (session as any).roles as any[] | undefined;
        if (!RBAC.canManageOwnProjects(roles) && !RBAC.canManageAll(roles)) return;
        await prisma.team.create({ data: { name, description } });
        return (await import("next/navigation")).redirect("/teams");
      }}
    >
      <div className="font-medium">Yeni Takım</div>
      <Input name="name" placeholder="Takım adı" required />
      <Textarea name="description" placeholder="Açıklama" />
      <Button type="submit">Oluştur</Button>
    </form>
  );
}
