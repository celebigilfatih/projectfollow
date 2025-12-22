"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function ConfirmDeleteModalButton({ formId, title, description }: { formId: string; title: string; description?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => setOpen(true)}><Trash2 className="h-4 w-4" /></Button>
      <Dialog open={open} onOpenChange={setOpen} contentClassName="max-w-md">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Silme Onayı</DialogTitle>
            <Button variant="ghost" onClick={() => setOpen(false)}>Vazgeç</Button>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm font-semibold">{title}</div>
            {description ? <div className="text-xs text-zinc-600">{description}</div> : null}
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>İptal</Button>
              <Button type="submit" form={formId} variant="destructive" onClick={() => setOpen(false)}>Onayla</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

