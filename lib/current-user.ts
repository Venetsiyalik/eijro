import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * JWT'dagi ma'lumot eskirgan bo'lishi mumkin (masalan isActive=false qilingandan keyin), shuning uchun
 * har so'rovda bazadan qayta tekshiramiz (§8.1). cache(): bitta so'rov ichida (layout + sahifa + komponentlar)
 * sessiya va baza tekshiruvi faqat bir marta bajariladi.
 */
const loadSession = cache(async () => {
  const session = await auth();
  if (!session?.user) return { hasSession: false as const, user: null };

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

  return { hasSession: true as const, user: user && user.isActive ? user : null };
});

/** Route Handler'lar uchun — redirect qilmaydi, null qaytaradi. */
export async function getSessionUser() {
  return (await loadSession()).user;
}

/** Sahifa/layout Server Component'lari uchun — sessiya yaroqsiz bo'lsa /login'ga yo'naltiradi. */
export async function requireUser() {
  const { hasSession, user } = await loadSession();
  if (!hasSession) redirect("/login");
  if (!user) redirect("/api/auth/invalidate");
  return user;
}
