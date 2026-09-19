"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { resetUserPassword, type UserActionState } from "@/actions/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GeneratedPasswordView } from "@/components/admin/generated-password-view";

const initialState: UserActionState = { error: null };

export function ResetPasswordDialog({ userId, username }: { userId: string; username: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(resetUserPassword, initialState);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Parolni tiklash">
          <KeyRound className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        {state.success && state.tempPassword ? (
          <>
            <DialogHeader>
              <DialogTitle>Parol tiklandi</DialogTitle>
            </DialogHeader>
            <GeneratedPasswordView
              username={state.username ?? username}
              password={state.tempPassword}
              onClose={() => setOpen(false)}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Parolni tiklash</DialogTitle>
              <DialogDescription>
                <span className="font-medium text-foreground">{username}</span> uchun yangi vaqtinchalik parol
                yaratiladi. Foydalanuvchi keyingi kirishda parolni almashtirishi shart bo&apos;ladi.
              </DialogDescription>
            </DialogHeader>
            <form action={formAction}>
              <input type="hidden" name="id" value={userId} />
              {state.error && (
                <p className="text-sm text-destructive mb-4" role="alert">
                  {state.error}
                </p>
              )}
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Yaratilmoqda..." : "Parolni tiklash"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
