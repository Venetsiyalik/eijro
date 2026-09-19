import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * JWT'dagi ma'lumot eskirgan bo'lishi mumkin (masalan isActive=false qilingandan
 * keyin), shuning uchun har so'rovda bazadan qayta tekshiramiz (§8.1: "isActive=false
 * bo'lsa sessiya darhol bekor"). Route Handler'lar uchun — redirect qilmaydi, null qaytaradi.
 */
export async function getSessionUser() {
  const session = await auth();
  if (!session?.user) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      fullName: true,
      position: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      departmentId: true,
      organizationId: true,
    },
  });

  if (!user || !user.isActive) return null;
  return user;
}

/** Sahifa/layout Server Component'lari uchun — sessiya yaroqsiz bo'lsa /login'ga yo'naltiradi. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await getSessionUser();
  if (!user) redirect("/api/auth/invalidate");

  return user;
}
