"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const initialState: ActionState = { error: null };

export function LoginForm({ passwordChanged }: { passwordChanged?: boolean }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ijro nazorati</CardTitle>
        <CardDescription>Tizimga kirish uchun login va parolingizni kiriting</CardDescription>
      </CardHeader>
      <CardContent>
        {passwordChanged && (
          <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 border border-green-200">
            Parolingiz muvaffaqiyatli almashtirildi. Endi yangi parol bilan kiring.
          </p>
        )}
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Login</Label>
            <Input id="username" name="username" autoComplete="username" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Parol</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Kirilmoqda..." : "Kirish"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
