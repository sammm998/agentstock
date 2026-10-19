import type { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>,
  );
}

/** Minimal, safe Markdown for agent artifacts (headings, lists, checkboxes, tables, emphasis). */
export function Markdown({ source }: { source: string }) {
  const blocks = source.split(/\n{2,}/);
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const first = lines[0] ?? "";
        if (first.startsWith("# ")) return <h3 key={i} className="text-lg font-bold">{first.slice(2)}</h3>;
        if (first.startsWith("## ")) {
          return (
            <div key={i}>
              <h4 className="font-semibold text-cloud">{first.slice(3)}</h4>
              {lines.length > 1 && <p className="mt-1 whitespace-pre-wrap text-muted">{inline(lines.slice(1).join("\n"))}</p>}
            </div>
          );
        }
        if (lines.every((l) => l.startsWith("|"))) {
          const rows = lines.filter((l) => !/^\|\s*-/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
          return (
            <table key={i} className="w-full text-left text-sm">
              <tbody className="divide-y divide-line">
                {rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k} className={`py-1.5 ${j === 0 ? "font-semibold" : ""}`}>{inline(c) || " "}</td>)}</tr>)}
              </tbody>
            </table>
          );
        }
        if (lines.every((l) => /^(- |\d+\. )/.test(l))) {
          return (
            <ul key={i} className="space-y-1">
              {lines.map((l, j) => {
                const box = l.match(/^- \[( |x)\] (.*)$/);
                if (box) return <li key={j} className="flex gap-2"><span aria-hidden="true">{box[1] === "x" ? "☑" : "☐"}</span><span>{inline(box[2]!)}</span></li>;
                return <li key={j} className="ml-5 list-disc marker:text-mint">{inline(l.replace(/^(- |\d+\. )/, ""))}</li>;
              })}
            </ul>
          );
        }
        if (/^_.*_$/.test(block.trim())) return <p key={i} className="italic text-muted">{block.trim().slice(1, -1)}</p>;
        return <p key={i} className="whitespace-pre-wrap">{inline(block)}</p>;
      })}
    </div>
  );
}
