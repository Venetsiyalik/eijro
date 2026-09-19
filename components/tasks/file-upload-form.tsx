"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FileUploadForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      ref={formRef}
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (!(formData.get("file") as File)?.size) return;

        startTransition(async () => {
          setError(null);
          const res = await fetch("/api/files/upload", { method: "POST", body: formData });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Faylni yuklab bo'lmadi");
            toast.error(data.error ?? "Faylni yuklab bo'lmadi");
            return;
          }
          formRef.current?.reset();
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="taskId" value={taskId} />
      <Input name="file" type="file" required className="max-w-xs" />
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? "Yuklanmoqda..." : "Yuklash"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
