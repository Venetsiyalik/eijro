"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

type NavItem = { href: string; label: string };

function items(role: Role): NavItem[] {
  return [
    { href: "/", label: "Bosh sahifa" },
    { href: "/tasks", label: "Topshiriqlar" },
    ...(role !== "EXECUTOR" ? [{ href: "/reports", label: "Hisobotlar" }] : []),
    { href: "/notifications", label: "Bildirishnomalar" },
    { href: "/profile", label: "Profil" },
    ...(role === "ADMIN" ? [{ href: "/admin", label: "Admin panel" }] : []),
  ];
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainNav({ role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap px-2 [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden" aria-label="Asosiy menyu">
      {items(role).map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "text-brand" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
            {active && <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
          </Link>
        );
      })}
    </nav>
  );
}
