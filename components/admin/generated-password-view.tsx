"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GeneratedPasswordView({
  username,
  password,
  onClose,
}: {
  username: string;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Vaqtinchalik parol yaratildi. Uni xodimga xabar qiling — bu parol{" "}
        <span className="font-medium text-foreground">faqat bir marta</span> shu yerda ko&apos;rsatiladi. Birinchi
        kirishda parolni almashtirish talab qilinadi.
      </p>
      <div className="rounded-md border bg-muted/40 p-3 space-y-1">
        <div className="text-xs text-muted-foreground">Login</div>
        <div className="font-mono text-sm">{username}</div>
        <div className="text-xs text-muted-foreground mt-2">Vaqtinchalik parol</div>
        <div className="font-mono text-lg tracking-wide">{password}</div>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={async () => {
            await navigator.clipboard.writeText(password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Nusxalandi" : "Nusxalash"}
        </Button>
        <Button type="button" className="flex-1" onClick={onClose}>
          Yopish
        </Button>
      </div>
    </div>
  );
}
