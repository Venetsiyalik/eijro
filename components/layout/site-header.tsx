import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/labels";
import type { Role } from "@prisma/client";

export function SiteHeader({
  fullName,
  role,
}: {
  fullName: string;
  role: Role;
}) {
  return (
    <header className="border-b bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold">
            Ijro nazorati
          </Link>
          <nav className="flex items-center gap-4 text-sm">
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
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {role === "ADMIN" && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin">
                <ShieldCheck className="size-4" />
                Admin panel
              </Link>
            </Button>
          )}
          <div className="text-right text-sm leading-tight">
            <div className="font-medium">{fullName}</div>
            <div className="text-muted-foreground">{ROLE_LABELS[role]}</div>
          </div>
          <form action={signOutAction}>
            <Button variant="ghost" size="icon" type="submit" title="Chiqish">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
