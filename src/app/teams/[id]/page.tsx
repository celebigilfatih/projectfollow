import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function TeamDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authConfig as any);
  if (!session) return redirect("/login");
  const team = await prisma.team.findUnique({ where: { id: params.id }, include: { members: { include: { user: true } } } });
  if (!team) return notFound();
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
  return (
    <div className="mx-auto max-w-4xl px-6 py-6 space-y-6">
      <h1 className="text-2xl font-semibold">{team.name}</h1>
      <p className="text-sm text-zinc-600">{team.description}</p>
      <AddMemberForm teamId={team.id} users={users} />
      <div className="rounded border bg-white p-4">
        <div className="font-medium mb-2">Üyeler</div>
        <ul className="space-y-2">
          {team.members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between rounded border p-2">
              <div>
                <div className="text-sm">{m.user?.name ?? m.user?.email}</div>
                <div className="text-xs text-zinc-500">{m.role ?? "Üye"}</div>
              </div>
              <form
                action={async () => {
                  "use server";
                  await fetch(`${process.env.NEXTAUTH_URL}/api/teams/${team.id}/members?userId=${m.userId}`, { method: "DELETE" });
                }}
              >
                <Button type="submit" variant="destructive" size="sm" className="text-xs">Kaldır</Button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AddMemberForm({ teamId, users }: { teamId: string; users: Array<{ id: string; email: string; name: string | null }> }) {
  return (
    <form
      className="rounded border bg-white p-4 space-y-2"
      action={async (formData: FormData) => {
        "use server";
        const userId = String(formData.get("userId") || "");
        const role = String(formData.get("role") || "");
        if (!userId) return;
        await fetch(`${process.env.NEXTAUTH_URL}/api/teams/${teamId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role: role || undefined }) });
      }}
    >
      <div className="font-medium">Üye ekle</div>
      <select name="userId" className="w-full rounded border px-3 py-2 text-sm" required>
        <option value="">Kullanıcı seç</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
        ))}
      </select>
      <Input name="role" placeholder="Rol (opsiyonel)" />
      <Button type="submit">Ekle</Button>
    </form>
  );
}
