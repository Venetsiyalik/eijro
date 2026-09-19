import { auth } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default async function ChangePasswordPage() {
  const session = await auth();
  return <ChangePasswordForm forced={!!session?.user?.mustChangePassword} />;
}
