"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth, signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { changePasswordSchema, loginSchema } from "@/lib/validators/auth";
import { writeAudit } from "@/lib/audit";

export type ActionState = { error: string | null };

const GENERIC_LOGIN_ERROR = "Login yoki parol noto'g'ri";

export async function loginAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  const precheck = await db.user.findUnique({
    where: { username: parsed.data.username },
    select: { lockedUntil: true },
  });

  if (precheck?.lockedUntil && precheck.lockedUntil > new Date()) {
    const minutesLeft = Math.max(1, Math.ceil((precheck.lockedUntil.getTime() - Date.now()) / 60000));
    return { error: `Hisob vaqtincha bloklangan. ${minutesLeft} daqiqadan so'ng qayta urinib ko'ring.` };
  }

  try {
    await signIn("credentials", {
      username: parsed.data.username,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: GENERIC_LOGIN_ERROR };
    }
    throw error;
  }

  redirect("/");
}

export async function changePasswordAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return { error: "Joriy parol noto'g'ri" };
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, mustChangePassword: false },
  });
  await writeAudit({ actorId: user.id, action: "PASSWORD_CHANGED" });

  await signOut({ redirect: false });
  redirect("/login?passwordChanged=1");
}

export async function signOutAction() {
  await signOut({ redirect: false });
  redirect("/login");
}
