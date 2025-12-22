import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Users } from "lucide-react";
import { RBAC } from "@/lib/rbac";
import ConfirmDeleteModalButton from "@/components/confirm-delete-modal-button";

export default async function TeamsPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const session = await getServerSession(authConfig as any);
  if (!session) return redirect("/login");
  const sp = searchParams ? await (searchParams as any) : {};
  const q = sp.q && sp.q !== "" ? sp.q : "";
  const teams = await prisma.team.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    include: { members: { include: { user: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true }, where: { deleted: false } });
  return (
    <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 lg:py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Takımlar</h1>
        <Link href="#create"><Button variant="outline" size="sm">Takım Ekle</Button></Link>
      </div>
      <Card className="p-3">
        <form
          className="flex items-end gap-2"
          action={async (formData: FormData) => {
            "use server";
            const q = String(formData.get("q") || "");
            const reset = String(formData.get("reset") || "");
            const qs = new URLSearchParams();
            if (!reset && q) qs.set("q", q);
            return (await import("next/navigation")).redirect(`/teams${qs.toString() ? `?${qs.toString()}` : ""}`);
          }}
        >
          <div className="flex-1">
            <label className="mb-1 block text-xs text-zinc-500">Takım Ara</label>
            <Input name="q" defaultValue={q} placeholder="Takım adı" />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" variant="outline" size="sm">Ara</Button>
            <Button type="submit" name="reset" value="1" variant="ghost" size="sm">Temizle</Button>
          </div>
        </form>
      </Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {teams.map((t) => (
          <Card key={t.id} className="transition duration-200">
            <div className="flex items-center justify-between">
              <Link href={`/teams/${t.id}`} className="font-medium hover:underline">{t.name}</Link>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Üye</span>
                <Badge className="text-sm bg-indigo-600 border-indigo-700 text-white flex items-center gap-1 px-2 py-1">
                  <Users className="h-3 w-3" />
                  <span>{t.members.length}</span>
                </Badge>
              </div>
            </div>
            <p className="mt-2 text-sm text-zinc-600">{t.description}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge className="bg-indigo-600 border-indigo-700 text-white">Yönetici {t.members.filter((m) => m.role === "Lead" || m.role === "Manager").length}</Badge>
              <Badge className="bg-zinc-700 border-zinc-800 text-white">Üye {t.members.filter((m) => !m.role || m.role === "Member").length}</Badge>
            </div>
            <div className="mt-2 text-xs text-zinc-600">Toplam üye: {t.members.length}</div>
            <div className="mt-1 text-xs text-zinc-500">Güncellenme: {new Date(t.updatedAt).toLocaleString()}</div>
            {t.members.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {t.members.map((m) => (
                  <Badge
                    key={m.userId}
                    className={(m.role === "Lead" || m.role === "Manager") ? "bg-indigo-600 border-indigo-700 text-white" : "bg-zinc-700 border-zinc-800 text-white"}
                  >
                    {((m.user?.name ?? m.user?.email) || m.userId) + ` (${(m.role && m.role !== "Member") ? "Yönetici" : "Üye"})`}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-xs text-zinc-500">Üye yok</div>
            )}
            <details className="mt-3 rounded border border-[var(--border)] bg-white" open={false as any}>
              <summary className="cursor-pointer select-none px-3 py-2 text-xs font-bold text-zinc-800">Üye Ekle</summary>
              <form
                className="px-3 pb-3 flex items-center gap-2"
                action={async (formData: FormData) => {
                  "use server";
                  const userId = String(formData.get("userId") || "");
                  const role = String(formData.get("role") || "Member");
                  if (!userId) return;
                  const session = await getServerSession(authConfig as any);
                  if (!session) return;
                  const roles = (session as any).roles as any[] | undefined;
                  if (!RBAC.canManageOwnProjects(roles) && !RBAC.canManageAll(roles)) {
                    return (await import("next/navigation")).redirect(`/teams?error=forbidden`);
                  }
                  await prisma.teamMember.create({ data: { teamId: t.id, userId, role } });
                  await prisma.activityLog.create({ data: { userId: (session as any).user?.id, teamId: t.id, action: "TeamMemberAdd", entityType: "TeamMember", metadata: { targetUserId: userId } } });
                  return (await import("next/navigation")).redirect("/teams?ok=member_added");
                }}
              >
                <select name="userId" className="w-full rounded border px-2 py-1 text-xs">
                  <option value="">Kullanıcı seç</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                  ))}
                </select>
                <Select name="role" defaultValue="Member" className="w-32 text-xs">
                  <option value="Member">Member</option>
                  <option value="Lead">Lead</option>
                  <option value="Manager">Manager</option>
                </Select>
                <Button type="submit" variant="outline" size="sm" className="text-[10px] px-2">Ekle</Button>
              </form>
            </details>
            <div className="mt-3 flex items-center gap-2">
              <Link href={`/teams/${t.id}`} className="rounded border px-2 py-1 text-xs">Detay</Link>
              <form id={`del-team-${t.id}`}
                action={async (formData: FormData) => {
                  "use server";
                  const session = await getServerSession(authConfig as any);
                  if (!session) return;
                  const roles = (session as any).roles as any[] | undefined;
                  if (!RBAC.canManageOwnProjects(roles) && !RBAC.canManageAll(roles)) {
                    return (await import("next/navigation")).redirect(`/teams?error=forbidden`);
                  }
                  const ok = formData.get("confirmDelete");
                  if (!ok) {
                    return (await import("next/navigation")).redirect(`/teams`);
                  }
                  await prisma.teamMember.deleteMany({ where: { teamId: t.id } });
                  await prisma.activityLog.deleteMany({ where: { teamId: t.id } });
                  await prisma.task.updateMany({ where: { assignedTeamId: t.id }, data: { assignedTeamId: null } });
                  await prisma.team.delete({ where: { id: t.id } });
                  return (await import("next/navigation")).redirect("/teams?ok=team_deleted");
                }}
              >
                <input type="hidden" name="confirmDelete" value="1" />
                <ConfirmDeleteModalButton
                  formId={`del-team-${t.id}`}
                  title={`Takımı Sil — ${t.name}`}
                  description={`Takım ve tüm üyelikler kaldırılacak. Takıma atanan görevlerin ataması kaldırılacak. Bu işlem geri alınamaz.`}
                />
              </form>
            </div>
          </Card>
        ))}
      </div>
      <CreateTeamForm />
    </div>
  );
}

function CreateTeamForm() {
  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle>Yeni Takım</CardTitle>
      </CardHeader>
      <form
        id="create"
        className="space-y-2"
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
        <Input name="name" placeholder="Takım adı" required />
        <Textarea name="description" placeholder="Açıklama" />
        <Button type="submit">Oluştur</Button>
      </form>
    </Card>
  );
}
