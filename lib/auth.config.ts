import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * Edge-safe qism: middleware shu konfiguratsiyadan foydalanadi.
 * Node.js'ga bog'liq narsalar (Prisma, bcryptjs) shu faylga kirmasin —
 * middleware Edge runtime'da ishlaydi.
 */
export const authConfig = {
  // Vercel/Nginx orqasida Host sarlavhasi platformadan keladi; AUTH_TRUST_HOST'ni qo'lda berish shart bo'lmasin.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 soat
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.username = user.username;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as Role;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
