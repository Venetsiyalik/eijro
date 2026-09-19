"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { acceptTask, returnTask, type ActionState } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: ActionState = { error: null };

export function AcceptButton({ taskId, assigneeId }: { taskId: string; assigneeId: string }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(acceptTask, initialState);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="assigneeId" value={assigneeId} />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Qabul qilinmoqda..." : "Qabul qilish"}
      </Button>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}

export function ReturnButton({ taskId, assigneeId }: { taskId: string; assigneeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(returnTask, initialState);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Qaytarish
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Topshiriqni qaytarish</DialogTitle>
          <DialogDescription>Qaytarish sababini kiriting — bu ijrochiga ko&apos;rsatiladi.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="assigneeId" value={assigneeId} />
          <Textarea name="reason" placeholder="Qaytarish sababi (majburiy)" rows={3} required />
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Qaytarilmoqda..." : "Qaytarish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
