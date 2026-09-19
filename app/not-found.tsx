import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl font-bold text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">Sahifa topilmadi</h1>
      <p className="max-w-sm text-muted-foreground">
        Siz izlagan sahifa mavjud emas yoki o&apos;chirilgan bo&apos;lishi mumkin.
      </p>
      <Button asChild>
        <Link href="/">Bosh sahifaga qaytish</Link>
      </Button>
    </div>
  );
}
