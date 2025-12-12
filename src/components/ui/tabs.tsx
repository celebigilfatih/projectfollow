"use client";
import { ReactNode, useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

export function Tabs({ tabs, defaultTab }: { tabs: { id: string; label: string; content: ReactNode }[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  useEffect(() => {
    const initialFromUrl = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const byParam = params.get("tab") || undefined;
        const byHash = window.location.hash ? window.location.hash.replace("#", "") : undefined;
        const desired = byParam || byHash;
        if (desired && tabs.some((t) => t.id === desired)) setActive(desired);
      } catch {};
    };
    initialFromUrl();
    const onHashChange = () => {
      const h = window.location.hash ? window.location.hash.replace("#", "") : undefined;
      if (h && tabs.some((t) => t.id === h)) setActive(h);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [tabs]);
  return (
    <div>
      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={twMerge("rounded-t-md px-3 py-2 text-sm", active === t.id ? "bg-white border-x border-t" : "hover:bg-neutral-100")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded-b-md border-x border-b bg-white p-4">
        {tabs.find((t) => t.id === active)?.content}
      </div>
    </div>
  );
}
