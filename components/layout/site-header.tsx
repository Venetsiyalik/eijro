import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { BrandStripe, Logo } from "@/components/brand/logo";
import { MainNav } from "@/components/layout/main-nav";
import { APP_NAME, ORG_NAME, ORG_SHORT_NAME } from "@/lib/brand";
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
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <BrandStripe />
      <div className="flex items-center gap-3 px-3 py-2 sm:px-4">
        <Link href="/" className="flex min-w-0 items-center gap-3" title={ORG_NAME}>
          <Logo size={40} priority />
          <div className="min-w-0 leading-tight">
            <div className="hidden text-[13px] font-semibold uppercase tracking-wide text-brand lg:block">{ORG_NAME}</div>
            <div className="line-clamp-2 text-[11px] font-semibold uppercase leading-tight tracking-wide text-brand sm:text-[13px] lg:hidden">{ORG_SHORT_NAME}</div>
            <div className="text-sm font-medium text-brand-green">{APP_NAME}</div>
          </div>
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" asChild className="relative" title="Bildirishnomalar">
            <Link href="/notifications">
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium leading-4 text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              <span className="sr-only">Bildirishnomalar{unreadCount > 0 ? `: ${unreadCount} ta yangi` : ""}</span>
            </Link>
          </Button>

          <Link href="/profile" className="hidden text-right text-sm leading-tight hover:underline md:block" title="Profil">
            <div className="font-medium">{fullName}</div>
            <div className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</div>
          </Link>

          <form action={signOutAction}>
            <Button variant="ghost" size="icon" type="submit" title="Chiqish">
              <LogOut className="size-5" />
              <span className="sr-only">Chiqish</span>
            </Button>
          </form>
        </div>
      </div>
      <div className="border-t">
        <MainNav role={role} />
      </div>
    </header>
  );
}
