import Image from "next/image";
import { cn } from "@/lib/utils";
import { ORG_NAME } from "@/lib/brand";

/** Tashkilot logotipi (public/logo.png, 368×320, next/image o'lchamga moslab siqadi). */
export function Logo({ size = 40, className, priority = false }: { size?: number; className?: string; priority?: boolean }) {
  const width = Math.round((size * 368) / 320);
  return (
    <Image
      src="/logo.png"
      alt={ORG_NAME}
      width={width}
      height={size}
      priority={priority}
      className={cn("shrink-0 select-none", className)}
    />
  );
}

/** Brend chizig'i: logotip ranglarida ko'kdan yashilga o'tuvchi ingichka chiziq. */
export function BrandStripe({ className }: { className?: string }) {
  return <div aria-hidden className={cn("h-1 w-full bg-gradient-to-r from-brand via-brand to-brand-green", className)} />;
}
