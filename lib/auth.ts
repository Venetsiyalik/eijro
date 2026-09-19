import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { loginSchema } from "@/lib/validators/auth";
import { writeAudit } from "@/lib/audit";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Login" },
        password: { label: "Parol", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { username, password } = parsed.data;

        const user = await db.user.findUnique({ where: { username } });

        if (!user) {
          await writeAudit({ action: "LOGIN_FAILED", meta: { username } });
          return null;
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await writeAudit({
            actorId: user.id,
            action: "LOGIN_FAILED",
            meta: { reason: "locked" },
          });
          return null;
        }

        if (!user.isActive) {
          await writeAudit({
            actorId: user.id,
            action: "LOGIN_FAILED",
            meta: { reason: "inactive" },
          });
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);

        if (!valid) {
          const nextCount = user.failedLoginCount + 1;
          const shouldLock = nextCount >= MAX_FAILED_ATTEMPTS;

          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: shouldLock ? 0 : nextCount,
              lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
            },
          });
          await writeAudit({
            actorId: user.id,
            action: "LOGIN_FAILED",
            meta: { reason: "bad_password" },
          });
          return null;
        }

        await db.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
        });
        await writeAudit({ actorId: user.id, action: "LOGIN_SUCCESS" });

        return {
          id: user.id,
          name: user.fullName,
          username: user.username,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
});
