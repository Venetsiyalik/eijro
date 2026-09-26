import { BrandStripe, Logo } from "@/components/brand/logo";
import { APP_NAME, ORG_NAME } from "@/lib/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-secondary/70 to-background">
      <BrandStripe />
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <Logo size={88} priority />
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase leading-snug tracking-wide text-brand">{ORG_NAME}</p>
              <h1 className="text-2xl font-bold text-brand-green">{APP_NAME}</h1>
            </div>
          </div>
          {children}
        </div>
      </div>
      <footer className="pb-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {ORG_NAME}
      </footer>
    </div>
  );
}
