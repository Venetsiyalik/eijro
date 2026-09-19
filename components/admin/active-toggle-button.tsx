"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ActiveToggleButton({
  id,
  isActive,
  toggleAction,
}: {
  id: string;
  isActive: boolean;
  toggleAction: (id: string, nextActive: boolean) => Promise<{ error: string | null }>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={isActive ? "outline" : "secondary"}
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await toggleAction(id, !isActive);
          if (result.error) toast.error(result.error);
        });
      }}
    >
      {isActive ? "Faolsizlantirish" : "Faollashtirish"}
    </Button>
  );
}
