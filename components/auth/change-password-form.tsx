"use client";

import { useActionState } from "react";
import { changePasswordAction, type ActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const initialState: ActionState = { error: null };

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [state, formAction, isPending] = useActionState(changePasswordAction, initialState);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Parolni almashtirish</CardTitle>
        <CardDescription>
          {forced
            ? "Birinchi marta kirganingiz uchun parolni almashtirishingiz shart"
            : "Yangi parol kamida 8 belgi, harf va raqamdan iborat bo'lishi kerak"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Joriy parol</Label>
            <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Yangi parol</Label>
            <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Yangi parolni tasdiqlang</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
          </div>
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Saqlanmoqda..." : "Parolni almashtirish"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
