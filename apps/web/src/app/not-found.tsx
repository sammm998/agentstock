import Link from "next/link";
import { LogoMark } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="aurora flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMark size={56} />
      <h1 className="mt-6 text-2xl font-bold">We couldn&apos;t find that</h1>
      <p className="mt-2 text-muted">It may have been removed, made private, or never existed.</p>
      <Link href="/" className="btn-primary mt-6">
        Back to Hustera
      </Link>
    </main>
  );
}
