"use client";
import { useState } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function UserTeamsMenuItem({ user, teams }: { user: { id: string; teamMemberships?: Array<{ team: { id: string; name: string }, role?: string }> }; teams: Array<{ id: string; name: string }> }) {
  const [open, setOpen] = useState(false);
  const [teamIds, setTeamIds] = useState<string[]>(
    (user.teamMemberships || []).map((tm) => tm.team.id)
  );
  const [rolesByTeam, setRolesByTeam] = useState<Record<string, string>>(
    Object.fromEntries((user.teamMemberships || []).map((tm) => [tm.team.id, tm.role || "Member"]))
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function save() {
    setLoading(true);
    try {
      const teamMemberships = teamIds.map((tid) => ({ teamId: tid, role: rolesByTeam[tid] || null }));
      const res = await fetch(`/api/users?id=${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamMemberships }) });
      if (res.ok) {
        toast.success("Takımlar güncellendi");
        setOpen(false);
        router.refresh();
      } else {
        toast.error("Güncelleme başarısız");
      }
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }}>Takımları düzenle</DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen} contentClassName="max-w-md">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Takımlar</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Select
              multiple
              value={teamIds}
              onChange={(e) => {
                const opts = Array.from((e.target as HTMLSelectElement).selectedOptions).map((o) => o.value);
                setTeamIds(opts);
                setRolesByTeam((prev) => {
                  const next: Record<string, string> = {};
                  for (const id of opts) next[id] = prev[id] || "Member";
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
              <div className="rounded border p-2 space-y-2">
                {teamIds.map((tid) => {
                  const team = teams.find((t) => t.id === tid);
                  return (
                    <div key={tid} className="flex items-center justify-between gap-2">
                      <div className="text-sm">{team?.name ?? tid}</div>
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
                  );
                })}
              </div>
            ) : null}
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Vazgeç</Button>
              <Button onClick={save} disabled={loading}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
