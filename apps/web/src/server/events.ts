import "server-only";
import { q, tx } from "./db";
import { UserError } from "./core";

export interface EventView {
  id: string;
  title: string;
  description: string;
  location: string;
  starts_at: Date;
  ends_at: Date | null;
  host_id: string;
  host_handle: string;
  host_name: string;
  space_slug: string | null;
  space_name: string | null;
  going: number;
  attending: boolean;
}

export async function createEvent(hostId: string, input: { title: string; description: string; location: string; startsAt: Date; spaceId: string | null }) {
  const title = input.title.trim();
  if (title.length < 3 || title.length > 100) throw new UserError("Title must be 3–100 characters");
  if (Number.isNaN(input.startsAt.getTime()) || input.startsAt.getTime() < Date.now() - 3600_000) throw new UserError("Choose a start time in the future");
  return tx(async (db) => {
    if (input.spaceId) {
      const [member] = await db.query(`select 1 from space_members where space_id = $1 and user_id = $2 and role in ('owner','moderator')`, [input.spaceId, hostId]);
      if (!member) throw new UserError("Only Space owners and moderators can add Space events");
    }
    const [e] = await db.query<{ id: string }>(
      `insert into events (host_id, space_id, title, description, location, starts_at) values ($1, $2, $3, $4, $5, $6) returning id`,
      [hostId, input.spaceId, title, input.description.trim().slice(0, 2000), input.location.trim().slice(0, 200), input.startsAt],
    );
    await db.query(`insert into event_rsvps (event_id, user_id) values ($1, $2)`, [e!.id, hostId]);
    return e!.id;
  });
}

/** Upcoming events visible to the viewer: public ones and those in Spaces they belong to. */
export async function upcomingEvents(viewerId: string | null) {
  return q<EventView>(
    `select e.id, e.title, e.description, e.location, e.starts_at, e.ends_at, e.host_id, p.handle as host_handle, p.display_name as host_name,
            s.slug as space_slug, s.name as space_name,
            (select count(*) from event_rsvps r where r.event_id = e.id)::int as going,
            exists (select 1 from event_rsvps r where r.event_id = e.id and r.user_id = $1) as attending
       from events e join profiles p on p.user_id = e.host_id left join spaces s on s.id = e.space_id
      where e.starts_at > now() - interval '3 hours'
        and (s.id is null or s.visibility = 'public' or exists (select 1 from space_members m where m.space_id = s.id and m.user_id = $1))
      order by e.starts_at asc limit 100`,
    [viewerId],
  );
}

export async function toggleRsvp(userId: string, eventId: string) {
  const removed = await q(`delete from event_rsvps where event_id = $1 and user_id = $2 returning 1`, [eventId, userId]);
  if (removed.length) return false;
  const visible = (await upcomingEvents(userId)).some((e) => e.id === eventId);
  if (!visible) throw new UserError("Event not found");
  await q(`insert into event_rsvps (event_id, user_id) values ($1, $2) on conflict do nothing`, [eventId, userId]);
  return true;
}

export async function deleteEvent(userId: string, eventId: string) {
  const rows = await q(`delete from events where id = $1 and host_id = $2 returning 1`, [eventId, userId]);
  if (!rows.length) throw new UserError("Event not found");
}

/** Interprets a datetime-local value ("2026-11-20T18:00") as Stockholm time. */
export function parseStockholmLocal(value: string): Date {
  const asUtc = new Date(`${value}:00Z`);
  if (Number.isNaN(asUtc.getTime())) return asUtc;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Stockholm", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(asUtc);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const shown = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(asUtc.getTime() - (shown - asUtc.getTime()));
}
