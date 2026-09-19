import Link from "next/link";
import { Bell, LogOut, ShieldCheck } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/labels";
import type { Role } from "@prisma/client";

export function SiteHeader({
  fullName,
  role,
  unreadCount = 0,
}: {
  fullName: string;
  role: Role;
  unreadCount?: number;
}) {
  return (
    <header className="border-b bg-background">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:h-14 sm:flex-nowrap sm:py-0">
        <Link href="/" className="font-semibold shrink-0">
          Ijro nazorati
        </Link>

        <nav className="order-last flex w-full items-center gap-4 overflow-x-auto whitespace-nowrap pb-1 text-sm sm:order-none sm:w-auto sm:pb-0">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Bosh sahifa
          </Link>
          <Link href="/tasks" className="text-muted-foreground hover:text-foreground">
            Topshiriqlar
          </Link>
          {role !== "EXECUTOR" && (
            <Link href="/reports" className="text-muted-foreground hover:text-foreground">
              Hisobotlar
            </Link>
          )}
          <Link href="/profile" className="text-muted-foreground hover:text-foreground sm:hidden">
            Profil
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {role === "ADMIN" && (
            <Button variant="outline" size="sm" asChild title="Admin panel">
              <Link href="/admin">
                <ShieldCheck className="size-4" />
                <span className="hidden sm:inline">Admin panel</span>
              </Link>
            </Button>
          )}

          <Button variant="ghost" size="icon" asChild className="relative" title="Bildirishnomalar">
            <Link href="/notifications">
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium leading-4 text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              <span className="sr-only">Bildirishnomalar{unreadCount > 0 ? `: ${unreadCount} ta yangi` : ""}</span>
            </Link>
          </Button>

          <Link href="/profile" className="hidden text-right text-sm leading-tight hover:underline sm:block" title="Profil">
            <div className="font-medium">{fullName}</div>
            <div className="text-muted-foreground">{ROLE_LABELS[role]}</div>
          </Link>

          <form action={signOutAction}>
            <Button variant="ghost" size="icon" type="submit" title="Chiqish">
              <LogOut className="size-4" />
              <span className="sr-only">Chiqish</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
