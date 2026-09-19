"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Xatolik yuz berdi</h1>
      <p className="max-w-md text-muted-foreground">
        So&apos;rovni bajarib bo&apos;lmadi. Iltimos, qayta urinib ko&apos;ring. Muammo takrorlansa, administratorga murojaat qiling.
      </p>
      {error.digest && <p className="font-mono text-xs text-muted-foreground">Kod: {error.digest}</p>}
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Qayta urinish</Button>
        <Button asChild variant="outline">
          <Link href="/">Bosh sahifa</Link>
        </Button>
      </div>
    </div>
  );
}
