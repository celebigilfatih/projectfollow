"use client";
import { useEffect, useRef, useState } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

type Team = { id: string; name: string };
type UserFull = { id: string; email: string; name: string | null; roles?: Array<{ role: { name: string } }>; teamMemberships?: Array<{ team: { id: string; name: string }, role?: string | null }> };

export default function UserEditMenuItem({ user, teams = [], mode = "menu" }: { user: UserFull; teams?: Team[]; mode?: "menu" | "icon" }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(user.email);
  const [name, setName] = useState(user.name ?? "");
  const [roles, setRoles] = useState<string[]>(Array.isArray(user.roles) ? user.roles.map((r) => r.role.name) : []);
  const [teamIds, setTeamIds] = useState<string[]>(Array.isArray(user.teamMemberships) ? user.teamMemberships.map((tm) => tm.team.id) : []);
  const [rolesByTeam, setRolesByTeam] = useState<Record<string, string>>(
    Object.fromEntries((user.teamMemberships || []).map((tm) => [tm.team.id, tm.role || "Member"]))
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const timer = useRef<number | null>(null);
  const router = useRouter();

  async function saveNow() {
    setSaving(true);
    try {
      const payload = {
        email,
        name,
        roles,
        teamMemberships: teamIds.map((tid) => ({ teamId: tid, role: rolesByTeam[tid] || "Member" })),
      };
      const res = await fetch(`/api/users?id=${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        setSavedAt(Date.now());
        router.refresh();
      } else {
        toast.error("Güncelleme başarısız");
      }
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        const payload = {
          email,
          name,
          roles,
          teamMemberships: teamIds.map((tid) => ({ teamId: tid, role: rolesByTeam[tid] || "Member" })),
        };
        const res = await fetch(`/api/users?id=${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) {
          setSavedAt(Date.now());
          router.refresh();
        }
      } finally {
        setSaving(false);
      }
    }, 600);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [email, name, roles, teamIds, rolesByTeam, open, router, user.id]);

  return (
    <>
      {mode === "menu" ? (
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }} className="flex items-center gap-2">
          <Pencil className="h-4 w-4" /> Düzenle
        </DropdownMenuItem>
      ) : (
        <Button type="button" variant="outline" size="sm" aria-label="Düzenle" title="Düzenle" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <Dialog open={open} onOpenChange={(v) => { if (!v) saveNow(); setOpen(v); }} contentClassName="max-w-md">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcıyı Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={saveNow} />
            <Input placeholder="Ad" value={name} onChange={(e) => setName(e.target.value)} onBlur={saveNow} />
            <div className="rounded-md border p-2">
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
            <div className="rounded-md border p-2">
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
                        <option value="Manager">Manager</option>
                      </select>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-600">Değişiklikler otomatik kaydedilir</div>
              <div className="text-xs text-zinc-600">{saving ? "Kaydediliyor..." : savedAt ? "Kaydedildi" : ""}</div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Kapat</Button>
              <Button onClick={saveNow} disabled={saving}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
