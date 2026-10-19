import "server-only";
import path from "node:path";
import { MIGRATIONS } from "./migrations";

export type Row = Record<string, unknown>;

export interface Queryable {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/**
 * Embedded Postgres (PGlite) is used for local development and tests, so the app
 * runs with no external services. Set DATABASE_URL to use a hosted Postgres
 * such as Supabase in production. Both run the same SQL migrations.
 */
async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, { max: 10, prepare: false });
    type Unsafe = { unsafe: (text: string, params: never[]) => Promise<unknown> };
    const wrap = (s: Unsafe): Queryable => ({
      async query<T>(text: string, params: unknown[] = []) {
        return (await s.unsafe(text, params as never[])) as T[];
      },
    });
    return {
      ...wrap(sql as unknown as Unsafe),
      async tx<T>(fn: (q: Queryable) => Promise<T>) {
        return (await sql.begin((t) => fn(wrap(t as unknown as Unsafe)))) as T;
      },
      async close() {
        await sql.end();
      },
    };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir =
    process.env.HUSTERA_DB === "memory"
      ? undefined
      : process.env.HUSTERA_DB_DIR ?? path.join(process.cwd(), ".data", "pglite");
  const pg = dataDir ? await PGlite.create(dataDir) : await PGlite.create();
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await pg.query<T>(text, params)).rows;
    },
    async tx<T>(fn: (q: Queryable) => Promise<T>) {
      return pg.transaction((t) =>
        fn({
          async query<R>(text: string, params: unknown[] = []) {
            return (await t.query<R>(text, params)).rows;
          },
        }),
      );
    },
    async close() {
      await pg.close();
    },
  };
}

async function migrate(db: Db) {
  await db.query(`create table if not exists schema_migrations (id text primary key, applied_at timestamptz not null default now())`);
  const applied = new Set((await db.query<{ id: string }>(`select id from schema_migrations`)).map((r) => r.id));
  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    await db.tx(async (q) => {
      for (const stmt of splitStatements(m.sql)) await q.query(stmt);
      await q.query(`insert into schema_migrations (id) values ($1)`, [m.id]);
    });
  }
}

/** Splits a migration into statements. Migrations must not contain `;` inside literals. */
function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*$/m)
    .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
    .filter(Boolean);
}

const globalForDb = globalThis as unknown as { __husteraDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.__husteraDb) {
    globalForDb.__husteraDb = createDb().then(async (db) => {
      await migrate(db);
      return db;
    });
    globalForDb.__husteraDb.catch(() => {
      globalForDb.__husteraDb = undefined;
    });
  }
  return globalForDb.__husteraDb;
}

/** Test helper: drops the cached connection so the next call starts fresh. */
export async function resetDbForTests() {
  const db = await globalForDb.__husteraDb;
  globalForDb.__husteraDb = undefined;
  await db?.close();
}

export async function q<T = Row>(text: string, params?: unknown[]): Promise<T[]> {
  return (await getDb()).query<T>(text, params);
}

export async function one<T = Row>(text: string, params?: unknown[]): Promise<T | null> {
  return (await q<T>(text, params))[0] ?? null;
}

export async function tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T> {
  return (await getDb()).tx(fn);
}
