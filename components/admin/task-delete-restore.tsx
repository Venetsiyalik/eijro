"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";
import { restoreTask, softDeleteTask, type ActionState } from "@/actions/task-admin";
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

export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(softDeleteTask, initialState);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="O'chirish">
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Topshiriqni o&apos;chirish</DialogTitle>
          <DialogDescription>
            Topshiriq ro&apos;yxatlar va hisobotlardan yashiriladi, ma&apos;lumotlari saqlanadi va keyin tiklash mumkin.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="taskId" value={taskId} />
          <Textarea name="reason" placeholder="Sabab (ixtiyoriy)" rows={2} />
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RestoreTaskButton({ taskId, label = false }: { taskId: string; label?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={label ? "outline" : "ghost"}
      size={label ? "sm" : "icon"}
      title="Tiklash"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await restoreTask(taskId);
          if (result.error) toast.error(result.error);
          else router.refresh();
        })
      }
    >
      <RotateCcw className="size-4" />
      {label && "Tiklash"}
    </Button>
  );
}
