"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Team = { id: string; name: string };

export default function CreateUserModal({ teams, label = "Yeni Kullanıcı", q }: { teams: Team[]; label?: string; q?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [rolesByTeam, setRolesByTeam] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function save() {
    if (!email || !password) {
      toast.error("Email ve şifre zorunlu");
      return;
    }
    setLoading(true);
    try {
      const teamMemberships = teamIds.map((tid) => ({ teamId: tid, role: rolesByTeam[tid] || "Member" }));
      const res = await fetch(`/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, roles, teamMemberships }),
      });
      if (!res.ok) throw new Error();
      toast.success("Kullanıcı oluşturuldu");
      setOpen(false);
      setEmail(""); setName(""); setPassword(""); setRoles([]); setTeamIds([]); setRolesByTeam({});
      if (q && q.length > 0) router.replace(`/admin/users?q=${encodeURIComponent(q)}`);
      router.refresh();
    } catch {
      toast.error("Oluşturma başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>{label}</Button>
      <Dialog open={open} onOpenChange={setOpen} contentClassName="max-w-3xl">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Ad" value={name} onChange={(e) => setName(e.target.value)} />
            <Input type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="rounded-md border p-2 md:col-span-3">
              <div className="mb-1 text-xs text-zinc-600">Roller</div>
              <Select
                multiple
                value={roles}
                onChange={(e) => {
                  const opts = Array.from((e.target as HTMLSelectElement).selectedOptions).map((o) => o.value);
                  setRoles(opts);
                }}
                className="h-24 w-full"
              >
                <option value="Admin">Admin</option>
                <option value="ProjectOwner">ProjectOwner</option>
                <option value="Technician">Technician</option>
              </Select>
            </div>
            <div className="rounded-md border p-2 md:col-span-3">
              <div className="mb-1 text-xs text-zinc-600">Takımlar</div>
              <Select
                multiple
                value={teamIds}
                onChange={(e) => {
                  const opts = Array.from((e.target as HTMLSelectElement).selectedOptions).map((o) => o.value);
                  setTeamIds(opts);
                  setRolesByTeam((prev) => {
                    const next: Record<string, string> = { ...prev };
                    for (const id of opts) if (!next[id]) next[id] = "Member";
                    for (const id of Object.keys(next)) if (!opts.includes(id)) delete next[id];
                    return next;
                  });
                }}
                className="h-28 w-full"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
              {teamIds.length > 0 ? (
                <div className="mt-2 rounded border p-2 space-y-2">
                  {teamIds.map((tid) => (
                    <div key={tid} className="flex items-center justify-between gap-2">
                      <div className="text-sm">{teams.find((t) => t.id === tid)?.name ?? tid}</div>
                      <select
                        value={rolesByTeam[tid] || "Member"}
                        onChange={(e) => setRolesByTeam((prev) => ({ ...prev, [tid]: e.target.value }))}
                        className="rounded border px-2 py-1 text-xs"
                      >
                        <option value="Member">Member</option>
                        <option value="Lead">Lead</option>
                      </select>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="md:col-span-3 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Vazgeç</Button>
              <Button onClick={save} disabled={loading}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
