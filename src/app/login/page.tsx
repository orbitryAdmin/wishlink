import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AdminLoginForm } from "@/components/admin-login-form";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/");
  }

  const configured = isAdminConfigured();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16">
      <Link href="/" className="mx-auto inline-flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-full bg-accent text-white">
          <Sparkles size={17} />
        </span>
        <span className="font-serif text-xl tracking-tight">Wishlist Studio</span>
      </Link>

      <section className="mt-8 rounded-3xl border border-line bg-card p-6 shadow-[0_20px_60px_-35px_rgba(28,25,23,0.35)]">
        <h1 className="font-serif text-2xl">Manager sign in</h1>
        <p className="mb-6 mt-2 text-sm leading-6 text-muted">
          Sign in to create and manage wishlists.
        </p>

        {configured ? (
          <AdminLoginForm />
        ) : (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
            Admin login is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD, and an AUTH_SECRET
            with at least 32 characters on the server.
          </p>
        )}
      </section>
    </main>
  );
}
