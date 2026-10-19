import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="aurora flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Link href="/" aria-label="Hustera home" className="mb-8">
        <Wordmark size={36} tagline />
      </Link>
      <main id="main" className="card w-full max-w-md p-6 sm:p-8">
        {children}
      </main>
    </div>
  );
}
