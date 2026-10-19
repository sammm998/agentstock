import { describe, expect, it } from "vitest";
import {
  canInSpace,
  canTransition,
  checkReservation,
  getTool,
  missionSchema,
  planMission,
  canOnPlatform,
  canRemoveMember,
  extractMentions,
  extractTags,
  handleSchema,
  nextTier,
  postSchema,
  signUpSchema,
  sparksToAward,
  tierFor,
} from "../src";

describe("validation", () => {
  it("normalises and validates handles", () => {
    expect(handleSchema.parse("  Ada_99 ")).toBe("ada_99");
    expect(handleSchema.safeParse("ab").success).toBe(false);
    expect(handleSchema.safeParse("has space").success).toBe(false);
    expect(handleSchema.safeParse("admin").success).toBe(false);
  });

  it("requires guideline acceptance and a strong-enough password on sign up", () => {
    const base = { email: "a@b.se", password: "correct horse", handle: "ada", displayName: "Ada" };
    expect(signUpSchema.safeParse({ ...base, acceptGuidelines: "on" }).success).toBe(true);
    expect(signUpSchema.safeParse(base).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, password: "short", acceptGuidelines: "on" }).success).toBe(false);
  });

  it("limits post length", () => {
    expect(postSchema.safeParse({ body: "x".repeat(1000), visibility: "public" }).success).toBe(true);
    expect(postSchema.safeParse({ body: "x".repeat(1001), visibility: "public" }).success).toBe(false);
    expect(postSchema.safeParse({ body: "   ", visibility: "public" }).success).toBe(false);
  });

  it("extracts tags and mentions", () => {
    expect(extractTags("Launching #Etsy shop #ai-business and #etsy again")).toEqual(["etsy", "ai"]);
    expect(extractMentions("thanks @Ada and @bob_1, mail me at x@y.se")).toEqual(["ada", "bob_1"]);
  });
});

describe("permissions", () => {
  it("applies the space role matrix", () => {
    expect(canInSpace("member", "post_message")).toBe(true);
    expect(canInSpace("member", "post_announcement")).toBe(false);
    expect(canInSpace("moderator", "delete_any_message")).toBe(true);
    expect(canInSpace("moderator", "assign_moderator")).toBe(false);
    expect(canInSpace(null, "read")).toBe(false);
  });

  it("prevents removing owners and limits moderators to members", () => {
    expect(canRemoveMember("owner", "moderator")).toBe(true);
    expect(canRemoveMember("moderator", "member")).toBe(true);
    expect(canRemoveMember("moderator", "moderator")).toBe(false);
    expect(canRemoveMember("owner", "owner")).toBe(false);
    expect(canRemoveMember("member", "member")).toBe(false);
  });

  it("restricts platform actions", () => {
    expect(canOnPlatform("user", "view_reports")).toBe(false);
    expect(canOnPlatform("moderator", "resolve_reports")).toBe(true);
    expect(canOnPlatform("moderator", "suspend_user")).toBe(false);
    expect(canOnPlatform("admin", "suspend_user")).toBe(true);
  });
});

describe("sparks", () => {
  it("enforces lifetime and daily limits", () => {
    expect(sparksToAward("first_post", { lifetimeCount: 0, todayCount: 0 })).toBe(10);
    expect(sparksToAward("first_post", { lifetimeCount: 1, todayCount: 0 })).toBe(0);
    expect(sparksToAward("post", { lifetimeCount: 40, todayCount: 4 })).toBe(2);
    expect(sparksToAward("post", { lifetimeCount: 40, todayCount: 5 })).toBe(0);
  });

  it("computes recognition tiers from lifetime earned Sparks", () => {
    expect(tierFor(0).id).toBe("spark");
    expect(tierFor(25).id).toBe("ember");
    expect(tierFor(249).id).toBe("flare");
    expect(tierFor(1000).id).toBe("nova");
    expect(nextTier(30)?.id).toBe("flare");
    expect(nextTier(500)).toBeNull();
  });
});

describe("agent foundation", () => {
  it("plans missions with valid dependencies and known tools", () => {
    for (const kind of ["start_business", "sell_existing"] as const) {
      const plan = planMission(kind);
      const keys = new Set(plan.map((t) => t.key));
      for (const t of plan) {
        expect(getTool(t.toolId), t.toolId).toBeDefined();
        for (const d of t.dependsOn) expect(keys.has(d)).toBe(true);
      }
    }
  });

  it("enforces the task state machine", () => {
    expect(canTransition("queued", "running")).toBe(true);
    expect(canTransition("succeeded", "queued")).toBe(false);
    expect(canTransition("awaiting_approval", "running")).toBe(false);
  });

  it("enforces per-task, per-day and total budget limits", () => {
    const limits = { totalCents: 100, perDayCents: 50, perTaskCents: 30 };
    expect(checkReservation(limits, { committedCents: 0, committedTodayCents: 0 }, 30).ok).toBe(true);
    expect(checkReservation(limits, { committedCents: 0, committedTodayCents: 0 }, 31).ok).toBe(false);
    expect(checkReservation(limits, { committedCents: 40, committedTodayCents: 40 }, 20).ok).toBe(false);
    expect(checkReservation(limits, { committedCents: 90, committedTodayCents: 0 }, 20).ok).toBe(false);
    expect(checkReservation(limits, { committedCents: 0, committedTodayCents: 0 }, -1).ok).toBe(false);
  });

  it("requires ownership for existing products and ordered limits", () => {
    const base = { kind: "sell_existing", title: "Planner", brief: "Printable weekly planner PDF", region: "Sweden", mode: "approve_each", totalCents: 100, perDayCents: 50, perTaskCents: 30 };
    expect(missionSchema.safeParse({ ...base, ownershipConfirmed: false }).success).toBe(false);
    expect(missionSchema.safeParse({ ...base, ownershipConfirmed: true }).success).toBe(true);
    expect(missionSchema.safeParse({ ...base, ownershipConfirmed: true, perTaskCents: 60 }).success).toBe(false);
  });
});
