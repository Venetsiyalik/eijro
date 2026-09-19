import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Ruxsat yo&apos;q</h1>
      <p className="text-muted-foreground max-w-sm">
        Sizda ushbu sahifani ko&apos;rish huquqi yo&apos;q.
      </p>
      <Button asChild>
        <Link href="/">Bosh sahifaga qaytish</Link>
      </Button>
    </div>
  );
}
