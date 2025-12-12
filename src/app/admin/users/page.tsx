import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RoleName } from "@prisma/client";

export default async function AdminUsersPage() {
  const session = await getServerSession(authConfig as any);
  if (!session) return null;
  const roles = (session as any).roles as string[] | undefined;
  if (!roles?.includes(RoleName.Admin)) return null;
  const users = await prisma.user.findMany({ include: { roles: { include: { role: true } } }, orderBy: { createdAt: "desc" } });
  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <h1 className="mb-4 text-2xl font-semibold">Kullanıcı Yönetimi</h1>
      <CreateUserForm />
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-left">Email</th>
            <th className="py-2 text-left">Ad</th>
            <th className="py-2 text-left">Roller</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="py-2">{u.email}</td>
              <td className="py-2">{u.name}</td>
              <td className="py-2">{u.roles.map((ur) => ur.role.name).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreateUserForm() {
  return (
    <form
      className="rounded border bg-white p-4 space-y-2"
      action={async (formData: FormData) => {
        "use server";
        const email = String(formData.get("email") || "");
        const name = String(formData.get("name") || "");
        const password = String(formData.get("password") || "");
        const roles = Array.from(formData.keys()).filter((k) => k.startsWith("role_")).map((k) => k.replace("role_", ""));
        await fetch(`${process.env.NEXTAUTH_URL}/api/users`, { method: "POST", body: JSON.stringify({ email, name, password, roles }) });
      }}
    >
      <div className="font-medium">Yeni Kullanıcı</div>
      <input name="email" placeholder="Email" className="w-full rounded border px-3 py-2 text-sm" required />
      <input name="name" placeholder="Ad" className="w-full rounded border px-3 py-2 text-sm" />
      <input name="password" type="password" placeholder="Şifre" className="w-full rounded border px-3 py-2 text-sm" required />
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="role_Admin" /> Admin</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="role_ProjectOwner" /> Proje Sorumlusu</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="role_Technician" /> Teknik Personel</label>
      </div>
      <button type="submit" className="rounded bg-black px-3 py-2 text-white">Oluştur</button>
    </form>
  );
}
