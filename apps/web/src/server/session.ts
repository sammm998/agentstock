import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, deleteSession, viewerForToken, type Viewer } from "./accounts";

const COOKIE = "hustera_session";

/** The signed-in user for this request, or null. Memoised per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return viewerForToken(token);
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  return viewer;
}

export async function startSession(userId: string) {
  const { token, expires } = await createSession(userId);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await deleteSession(token);
  jar.delete(COOKIE);
}
