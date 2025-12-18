'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { twMerge } from "tailwind-merge";
import { Home, Calendar, FolderKanban, Users, NotebookPen, ListTodo } from "lucide-react";

type IconName = "home" | "calendar" | "folder-kanban" | "users" | "notebook-pen" | "list-todo";
type Item = { href: string; label: string; icon: IconName; exact?: boolean };

function IconByName({ name, className }: { name: IconName; className?: string }) {
  const map: Record<IconName, React.ElementType> = {
    "home": Home,
    "calendar": Calendar,
    "folder-kanban": FolderKanban,
    "users": Users,
    "notebook-pen": NotebookPen,
    "list-todo": ListTodo,
  };
  const Comp = map[name];
  return <Comp className={className} />;
}

export default function SidebarNav({ items }: { items: Item[] }) {
  const pathname = usePathname() ?? "/";
  return (
    <ul className="mt-2 space-y-1">
      {items.map((it) => {
        const isActive = it.exact ? pathname === it.href : pathname.startsWith(it.href);
        const cls = twMerge(
          "flex items-center gap-2 rounded-md px-2 py-2",
          isActive
            ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
            : "text-neutral-700 hover:bg-neutral-100"
        );
        const iconCls = isActive ? "h-4 w-4 text-[var(--primary-foreground)]" : "h-4 w-4 text-neutral-600";
        return (
          <li key={it.href}>
            <Link href={it.href} className={cls}>
              <IconByName name={it.icon} className={iconCls} />
              {it.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
