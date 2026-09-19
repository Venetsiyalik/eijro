"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { createOrganization, updateOrganization, type ActionState } from "@/actions/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrgOption = { id: string; name: string };

const initialState: ActionState = { error: null };

export function OrganizationFormDialog({
  mode,
  organization,
  parentOptions,
}: {
  mode: "create" | "edit";
  organization?: { id: string; name: string; shortName: string | null; region: string | null; parentId: string | null };
  parentOptions: OrgOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createOrganization : updateOrganization;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [parentId, setParentId] = useState(organization?.parentId ?? "__none__");

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button size="sm">
            <Plus className="size-4" />
            Yangi tashkilot
          </Button>
        ) : (
          <Button variant="ghost" size="icon" title="Tahrirlash">
            <Pencil className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Yangi tashkilot" : "Tashkilotni tahrirlash"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Yangi tashkilot yoki hududiy kengash qo'shing" : "Tashkilot ma'lumotlarini yangilang"}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {mode === "edit" && organization && <input type="hidden" name="id" value={organization.id} />}
          <div className="space-y-2">
            <Label htmlFor="name">Nomi</Label>
            <Input id="name" name="name" defaultValue={organization?.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shortName">Qisqa nomi</Label>
            <Input id="shortName" name="shortName" defaultValue={organization?.shortName ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Hudud</Label>
            <Input id="region" name="region" defaultValue={organization?.region ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parentId">Ota-tashkilot</Label>
            <Select name="parentId" value={parentId} onValueChange={setParentId}>
              <SelectTrigger id="parentId" className="w-full">
                <SelectValue placeholder="Yo'q (Respublika Kengashi darajasida)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Yo&apos;q</SelectItem>
                {parentOptions
                  .filter((o) => o.id !== organization?.id)
                  .map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
