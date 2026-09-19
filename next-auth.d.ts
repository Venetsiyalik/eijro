import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    username: string;
    role: Role;
    mustChangePassword: boolean;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      role: Role;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: Role;
    mustChangePassword: boolean;
  }
}
