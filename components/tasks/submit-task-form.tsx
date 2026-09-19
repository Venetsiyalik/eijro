"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { submitTask, type ActionState } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: ActionState = { error: null };

export function SubmitTaskForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(submitTask, initialState);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ijroga topshirish</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="taskId" value={taskId} />
          <Textarea name="comment" placeholder="Bajarilgan ish haqida izoh (majburiy)" rows={3} required />
          <div className="space-y-2">
            <Label htmlFor="resultFile">Natija fayli (ixtiyoriy)</Label>
            <Input id="resultFile" name="resultFile" type="file" />
          </div>
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Topshirilmoqda..." : "Ijroga topshirish"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
