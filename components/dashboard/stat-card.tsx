import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "default" | "danger" | "success";

const TONE_CLASSES: Record<Tone, string> = {
  default: "",
  danger: "border-red-300 bg-red-50",
  success: "border-green-300 bg-green-50",
};

const VALUE_CLASSES: Record<Tone, string> = {
  default: "",
  danger: "text-red-700",
  success: "text-green-700",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <Card className={cn(TONE_CLASSES[tone])}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-3xl font-bold", VALUE_CLASSES[tone])}>{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}
