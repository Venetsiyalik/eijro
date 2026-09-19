"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Bosh sahifa" },
  { href: "/admin/users", label: "Foydalanuvchilar" },
  { href: "/admin/organizations", label: "Tashkilotlar" },
  { href: "/admin/departments", label: "Bo'limlar" },
  { href: "/admin/tasks", label: "Topshiriqlar" },
  { href: "/admin/audit", label: "Audit jurnali" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="w-56 shrink-0 border-r p-4 space-y-1">
      {LINKS.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
