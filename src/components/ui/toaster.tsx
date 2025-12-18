"use client";
import { Toaster, toast } from "sonner";
import { useEffect } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

export default function AppToaster(props: React.ComponentProps<typeof Toaster>) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const error = sp.get("error");
    const ok = sp.get("ok");
    if (!error && !ok) return;

    if (error === "forbidden") {
      toast.error("Bu işlem için yetkiniz yok.");
    }

    if (ok === "member_added") {
      toast.success("Üye eklendi.");
    } else if (ok === "member_removed") {
      toast.success("Üye kaldırıldı.");
    } else if (ok === "team_deleted") {
      toast.success("Takım silindi.");
    }

    const params = new URLSearchParams(sp.toString());
    params.delete("error");
    params.delete("ok");
    const url = pathname + (params.toString() ? `?${params.toString()}` : "");
    router.replace(url);
  }, [sp, pathname, router]);

  return <Toaster {...props} />;
}
