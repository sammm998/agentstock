import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, MapPin, Trash2 } from "lucide-react";
import { getViewer } from "@/server/session";
import { upcomingEvents } from "@/server/events";
import { mySpaces } from "@/server/spaces";
import { createEventAction, deleteEventAction, rsvpAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Events" };

function when(d: Date) {
  return new Date(d).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" });
}

export default async function EventsPage() {
  const viewer = await getViewer();
  const [events, spaces] = await Promise.all([upcomingEvents(viewer?.id ?? null), viewer ? mySpaces(viewer.id) : Promise.resolve([])]);
  const hostable = spaces.filter((s) => s.role === "owner" || s.role === "moderator");
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <PageHeader title="Events" description="Live sessions, co-working, launches and workshops from the community. Times shown in Stockholm time." />
        {events.length ? (
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.id} className="card flex flex-wrap gap-4 p-5">
                <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo/20 text-center">
                  <span className="text-xs uppercase text-[#c9c4ff]">{new Date(e.starts_at).toLocaleString("en-GB", { month: "short", timeZone: "Europe/Stockholm" })}</span>
                  <span className="text-2xl font-bold">{new Date(e.starts_at).toLocaleString("en-GB", { day: "numeric", timeZone: "Europe/Stockholm" })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{e.title}</h2>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    <span className="flex items-center gap-1"><CalendarDays size={12} aria-hidden="true" />{when(e.starts_at)}</span>
                    {e.location && <span className="flex items-center gap-1"><MapPin size={12} aria-hidden="true" />{e.location}</span>}
                    <span>by <Link href={`/u/${e.host_handle}`} className="underline">{e.host_name}</Link></span>
                    {e.space_slug && <Link href={`/s/${e.space_slug}`} className="chip">{e.space_name}</Link>}
                  </p>
                  {e.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{e.description}</p>}
                  <p className="mt-2 text-xs text-muted">{e.going} going</p>
                </div>
                {viewer && (
                  <div className="flex items-start gap-2">
                    <ActionForm action={rsvpAction}>
                      <input type="hidden" name="eventId" value={e.id} />
                      <button className={e.attending ? "btn-secondary btn-sm" : "btn-primary btn-sm"}>{e.attending ? "Going ✓" : "RSVP"}</button>
                    </ActionForm>
                    {e.host_id === viewer.id && (
                      <ActionForm action={deleteEventAction} confirm="Cancel this event?">
                        <input type="hidden" name="eventId" value={e.id} />
                        <button className="btn-ghost btn-sm" aria-label="Cancel event"><Trash2 size={14} /></button>
                      </ActionForm>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<CalendarDays size={26} />} title="No upcoming events">Host the first one — a co-working session, a launch or a Q&amp;A.</EmptyState>
        )}
      </div>
      {viewer && (
        <aside className="card h-fit p-5">
          <h2 className="font-semibold">Host an event</h2>
          <ActionForm action={createEventAction} reset showOk className="mt-4 space-y-3">
            <div><label className="label" htmlFor="etitle">Title</label><input id="etitle" name="title" required minLength={3} maxLength={100} className="input" /></div>
            <div><label className="label" htmlFor="startsAt">Starts (Stockholm time)</label><input id="startsAt" name="startsAt" type="datetime-local" required className="input" /></div>
            <div><label className="label" htmlFor="location">Where</label><input id="location" name="location" maxLength={200} placeholder="Link to a call, or a place" className="input" /></div>
            <div><label className="label" htmlFor="edesc">Description</label><textarea id="edesc" name="description" maxLength={2000} rows={3} className="input" /></div>
            {hostable.length > 0 && (
              <div>
                <label className="label" htmlFor="spaceId">Space (optional)</label>
                <select id="spaceId" name="spaceId" className="input"><option value="">Public event</option>{hostable.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              </div>
            )}
            <button className="btn-primary w-full">Create event</button>
          </ActionForm>
        </aside>
      )}
    </div>
  );
}
