import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Sparkles size={22} />
      </span>
      <h1 className="mt-6 font-serif text-4xl tracking-tight">This wishlist is missing</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        The link may have been deleted, or the address is wrong. Head back to the dashboard to
        create a new collection.
      </p>
      <Link href="/" className="btn-primary mt-7">
        Back to dashboard
      </Link>
    </main>
  );
}
