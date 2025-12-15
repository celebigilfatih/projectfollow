import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RoleName } from "@prisma/client";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import UserDetailMenuItem from "@/components/user-detail-modal";
import UserRolesMenuItem from "@/components/user-roles-modal";
import UserTeamsMenuItem from "@/components/user-teams-modal";
import CreateUserModal from "@/components/create-user-modal";

export default async function AdminUsersPage() {
  const session = await getServerSession(authConfig as any);
  if (!session) return null;
  const roles = (session as any).roles as string[] | undefined;
  if (!roles?.includes(RoleName.Admin)) return null;
  const [users, teams] = await Promise.all([
    prisma.user.findMany({ include: { roles: { include: { role: true } }, teamMemberships: { include: { team: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.team.findMany({ select: { id: true, name: true } }),
  ]);
  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kullanıcı Yönetimi</h1>
        <CreateUserModal teams={teams} label="Yeni Kullanıcı" />
      </div>
      <table className="mt-6 w-full text-sm">
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
              <td className="py-2">{u.roles.map((ur) => ur.role.name).join(", ")}</td>
              <td className="py-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <UserDetailMenuItem user={u as any} />
                    <UserRolesMenuItem user={u as any} />
                    <UserTeamsMenuItem user={u as any} teams={teams} />
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Eski CreateUserForm kaldırıldı, modal kullanılmaktadır.
