import type { Metadata } from "next";
import { simulateTimeWeightedShares } from "@hustera/domain";
import { Illustrative, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Funding simulator" };

const DEFAULTS = [
  { name: "Participant A", units: 10, joinedDay: 0 },
  { name: "Participant B", units: 25, joinedDay: 10 },
  { name: "Participant C", units: 5, joinedDay: 20 },
];

function num(v: string | undefined, fallback: number, min: number, max: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export default async function SimulatorPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const period = num(sp.period, 30, 1, 365);
  const result = num(sp.result, 300, -100000, 100000);
  const people = DEFAULTS.map((d, i) => ({ name: d.name, units: num(sp[`u${i}`], d.units, 0, 1000), joinedDay: num(sp[`d${i}`], d.joinedDay, 0, 365) }));
  const rows = simulateTimeWeightedShares(people, period, result);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Community funding simulator" description="An educational model of how time-weighted participation in a shared project could be split." />
      <div className="card border-warning/30 p-5 text-sm">
        <Illustrative>Simulation only</Illustrative>
        <p className="mt-2 text-muted">Hustera does not pool money, sell shares or pay returns. Units here are imaginary and the “result” is a number you type in. Real community funding would require specialist legal authorisation (crowdfunding / investment rules) and licensed partners.</p>
      </div>
      <form className="card grid gap-4 p-6 sm:grid-cols-2">
        <div><label className="label" htmlFor="period">Period (days)</label><input id="period" name="period" type="number" min={1} max={365} defaultValue={period} className="input" /></div>
        <div><label className="label" htmlFor="result">Hypothetical project result</label><input id="result" name="result" type="number" defaultValue={result} className="input" /></div>
        {people.map((p, i) => (
          <fieldset key={i} className="grid grid-cols-2 gap-3 sm:col-span-2">
            <legend className="mb-1 text-sm font-medium">{p.name}</legend>
            <label className="text-xs text-muted">Units<input name={`u${i}`} type="number" min={0} max={1000} defaultValue={p.units} className="input mt-1" /></label>
            <label className="text-xs text-muted">Joined on day<input name={`d${i}`} type="number" min={0} max={365} defaultValue={p.joinedDay} className="input mt-1" /></label>
          </fieldset>
        ))}
        <button className="btn-primary sm:col-span-2">Recalculate</button>
      </form>
      <section className="card p-6" aria-labelledby="sim-h">
        <h2 id="sim-h" className="font-semibold">Simulated split</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="py-2 font-medium">Participant</th><th className="py-2 font-medium">Weight (units × days)</th><th className="py-2 font-medium">Share</th><th className="py-2 text-right font-medium">Simulated amount</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.name}><td className="py-2">{r.name}</td><td className="py-2">{r.weight}</td><td className="py-2">{(r.share * 100).toFixed(1)}%</td><td className="py-2 text-right">{r.simulatedAmount}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
