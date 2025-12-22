import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RoleName } from "@prisma/client";
import { RBAC } from "@/lib/rbac";
 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CreateUserModal from "@/components/create-user-modal";
import UserEditMenuItem from "@/components/user-edit-modal";
import ConfirmDeleteModalButton from "@/components/confirm-delete-modal-button";

export default async function PeoplePage({ searchParams }: { searchParams?: { q?: string } }) {
  const session = await getServerSession(authConfig as any);
  if (!session) return null;
  const roles = (session as any).roles as RoleName[] | undefined;
  const params = searchParams ? await (searchParams as any) : {};
  const q = params.q ?? "";
  const [users, teams] = await Promise.all([
    prisma.user.findMany({
      where: {
        deleted: false,
        OR: q
          ? [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: { roles: { include: { role: true } }, teamMemberships: { include: { team: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.team.findMany({ select: { id: true, name: true } }),
  ]);
  return (
    <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 lg:py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kişiler</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Arama</CardTitle>
        </CardHeader>
        <form method="GET" className="flex items-center gap-2">
          <Input name="q" defaultValue={q} placeholder="Email veya ad ile ara" />
          <Button type="submit" variant="outline" size="sm">Ara</Button>
        </form>
      </Card>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-zinc-600">Toplam {users.length}</div>
        {roles?.includes(RoleName.Admin) ? <CreateUserModal teams={teams} q={q} /> : null}
      </div>
      <div className="mt-6 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left">Email</th>
            <th className="py-2 text-left">Ad</th>
            <th className="py-2 text-left">Roller</th>
            <th className="py-2 text-left">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="py-2">{u.email}</td>
              <td className="py-2">{u.name}</td>
              <td className="py-2">
                <div className="flex flex-wrap gap-1">
                  {u.roles.map((ur) => (
                    <Badge key={ur.role.name} className={ur.role.name === RoleName.Admin ? "bg-red-600 border-red-700 text-white" : ur.role.name === RoleName.ProjectOwner ? "bg-indigo-600 border-indigo-700 text-white" : "bg-zinc-700 border-zinc-800 text-white"}>{ur.role.name}</Badge>
                  ))}
                </div>
              </td>
              <td className="py-2">
                {roles?.includes(RoleName.Admin) ? (
                  <div className="flex items-center gap-2">
                    <UserEditMenuItem user={u as any} teams={teams} mode="icon" />
                    <DeleteUserForm id={u.id} email={u.email} name={u.name ?? ""} q={q} />
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}



function DeleteUserForm({ id, email, name, q }: { id: string; email: string; name?: string; q?: string }) {
  return (
    <form id={`del-user-${id}`}
      action={async (formData: FormData) => {
        "use server";
        const session = await getServerSession(authConfig as any);
        if (!session) return;
        const roles = (session as any).roles as any[] | undefined;
        if (!RBAC.canManageAll(roles)) {
          return (await import("next/navigation")).redirect(`/people?q=${encodeURIComponent(q || "")}&error=forbidden`);
        }
        const ok = formData.get("confirmDelete");
        if (!ok) {
          const url = q && q.length > 0 ? `/people?q=${encodeURIComponent(q)}` : "/people";
          return (await import("next/navigation")).redirect(url);
        }
        await prisma.user.update({ where: { id }, data: { deleted: true } });
        await prisma.session.deleteMany({ where: { userId: id } });
        await prisma.account.deleteMany({ where: { userId: id } });
        await prisma.activityLog.create({ data: { userId: (session as any).user?.id, action: "UserDelete", entityType: "User", metadata: { targetUserId: id } } });
        const url = q && q.length > 0 ? `/people?q=${encodeURIComponent(q)}` : "/people";
        return (await import("next/navigation")).redirect(url);
      }}
    >
      <input type="hidden" name="confirmDelete" value="1" />
      <ConfirmDeleteModalButton
        formId={`del-user-${id}`}
        title={`Kullanıcıyı Sil — ${name && name.length > 0 ? name : email}`}
        description={`${name && name.length > 0 ? name + " • " : ""}${email} kullanıcısı ve ilişkili oturumlar kaldırılacak. Bu işlem geri alınamaz.`}
      />
    </form>
  );
}
 
