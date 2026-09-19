import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/lib/auth";

/**
 * requireUser() render vaqtida signOut() chaqira olmaydi (cookie faqat
 * Server Action/Route Handler'da o'zgartirilishi mumkin), shuning uchun
 * isActive=false yoki sessiya yaroqsiz bo'lganda shu route'ga yo'naltiradi.
 */
export async function GET(request: NextRequest) {
  await signOut({ redirect: false });
  return NextResponse.redirect(new URL("/login", request.url));
}
