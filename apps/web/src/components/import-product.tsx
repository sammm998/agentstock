"use client";

import { useState, useTransition } from "react";
import { importProductAction } from "@/app/actions";

/** Prefills the product form from a public product page. */
export function ImportProduct() {
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-midnight/40 p-3">
      <div className="min-w-56 flex-1">
        <label htmlFor="import-url" className="text-xs text-muted">Import from a product page you own (optional)</label>
        <input id="import-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-shop.example/product" className="input mt-1" />
      </div>
      <button
        type="button"
        className="btn-secondary"
        disabled={pending || !url}
        onClick={() =>
          start(async () => {
            const fd = new FormData();
            fd.set("url", url);
            const r = await importProductAction(fd);
            if (r?.error || !r?.ok) return setMsg({ ok: false, text: r?.error ?? "Import failed" });
            const data = JSON.parse(r.ok) as { title: string; description: string; sourceUrl: string };
            const set = (id: string, v: string) => {
              const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
              if (el) el.value = v;
            };
            set("ptitle", data.title);
            set("pdesc", data.description);
            set("sourceUrl", data.sourceUrl);
            setMsg({ ok: true, text: "Details imported — review them below." });
          })
        }
      >
        {pending ? "Importing…" : "Import"}
      </button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`basis-full text-sm ${msg.ok ? "text-mint" : "text-danger"}`}>{msg.text}</p>}
    </div>
  );
}
