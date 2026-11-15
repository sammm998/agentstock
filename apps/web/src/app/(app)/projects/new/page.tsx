import { redirect } from "next/navigation";

/** Missions are started from an agent; the catalog explains each workflow first. */
export default function NewMissionPage() {
  redirect("/agents");
}
