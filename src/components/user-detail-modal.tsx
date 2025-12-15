"use client";
import { useState } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function UserDetailMenuItem({ user }: { user: { id: string; email: string; name: string | null; roles: Array<{ role: { name: string } }>; teamMemberships?: Array<{ team: { name: string }, role?: string | null }>; createdAt?: string | Date; updatedAt?: string | Date } }) {
  const [open, setOpen] = useState(false);
  const created = user.createdAt ? new Date(user.createdAt) : undefined;
  const updated = user.updatedAt ? new Date(user.updatedAt) : undefined;
  return (
    <>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }}>Detay</DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen} contentClassName="max-w-lg">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Detayı</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div>
              <div className="mb-1 text-xs text-zinc-600">Email</div>
              <div className="text-sm">{user.email}</div>
            </div>
            <div>
              <div className="mb-1 text-xs text-zinc-600">Ad</div>
              <div className="text-sm">{user.name ?? "-"}</div>
            </div>
            <div>
              <div className="mb-1 text-xs text-zinc-600">Roller</div>
              <div className="flex flex-wrap gap-1">
                {user.roles.map((ur) => (
                  <Badge key={ur.role.name}>{ur.role.name}</Badge>
                ))}
              </div>
            </div>
            {user.teamMemberships && user.teamMemberships.length > 0 ? (
              <div>
                <div className="mb-1 text-xs text-zinc-600">Takımlar</div>
                <div className="flex flex-wrap gap-1">
                  {user.teamMemberships.map((tm) => (
                    <Badge key={tm.team.name}>{tm.team.name}{tm.role ? ` (${tm.role})` : ""}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {created ? (
              <div>
                <div className="mb-1 text-xs text-zinc-600">Oluşturulma</div>
                <div className="text-sm">{created.toLocaleString()}</div>
              </div>
            ) : null}
            {updated ? (
              <div>
                <div className="mb-1 text-xs text-zinc-600">Güncellenme</div>
                <div className="text-sm">{updated.toLocaleString()}</div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
