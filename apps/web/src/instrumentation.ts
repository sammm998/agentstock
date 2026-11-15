/** Starts the in-process agent worker on the Node.js server (disable with HUSTERA_WORKER=off). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.HUSTERA_WORKER === "off" || process.env.NODE_ENV !== "production") return;
  const { runBackgroundWork } = await import("./server/worker");
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await runBackgroundWork();
    } catch (e) {
      console.error("[worker]", e instanceof Error ? e.message : e);
    } finally {
      busy = false;
    }
  };
  setTimeout(tick, 20_000);
  setInterval(tick, 60_000);
}
