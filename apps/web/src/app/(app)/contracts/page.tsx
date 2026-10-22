import Link from "next/link";
import type { Metadata } from "next";
import { formatCents } from "@hustera/domain";
import { requireViewer } from "@/server/session";
import { myContracts } from "@/server/marketplace";
import { EmptyState, PageHeader, TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Contracts" };

export default async function ContractsPage() {
  const viewer = await requireViewer();
  const contracts = await myContracts(viewer.id);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Contracts" description="Work you've hired others for, and work you're delivering." />
      {contracts.length ? (
        <ul className="card divide-y divide-line">
          {contracts.map((c) => {
            const selling = c.seller_id === viewer.id;
            return (
              <li key={c.id}>
                <Link href={`/contracts/${c.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-slate-2/60">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted">{selling ? `Buyer @${c.buyer_handle ?? "deleted"}` : `Seller @${c.seller_handle ?? "deleted"}`} · updated <TimeAgo date={c.updated_at} /></p>
                  </div>
                  <span className="chip capitalize">{c.status.replace("_", " ")}</span>
                  <span className="font-semibold">{formatCents(c.price_cents)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="No contracts yet" action={<Link href="/marketplace" className="btn-primary">Browse the marketplace</Link>}>Hire someone or offer your own service.</EmptyState>
      )}
    </div>
  );
}
