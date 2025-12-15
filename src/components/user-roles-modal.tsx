"use client";
import { useState } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function UserRolesMenuItem({ user }: { user: { id: string; roles: Array<{ role: { name: string } }> } }) {
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<string[]>(user.roles.map((r) => r.role.name));
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function save() {
    setLoading(true);
    try {
      const res = await fetch(`/api/users?id=${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roles }) });
      if (res.ok) {
        toast.success("Roller güncellendi");
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
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }}>Roller düzenle</DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen} contentClassName="max-w-md">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Roller</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
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

