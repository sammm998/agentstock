import { z } from "zod";

/** Reserved handles that would collide with routes or impersonate staff. */
export const RESERVED_HANDLES = new Set([
  "admin", "administrator", "api", "app", "brand", "card", "communities", "discover",
  "help", "home", "hustera", "invite", "legal", "marketplace", "messages", "moderation",
  "moderator", "notifications", "opportunities", "post", "projects", "rewards", "root",
  "settings", "signin", "signup", "sparks", "staff", "support", "system", "wallet",
]);

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Handle must be at least 3 characters")
  .max(24, "Handle must be at most 24 characters")
  .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers and underscores only")
  .refine((h) => !RESERVED_HANDLES.has(h), "That handle is reserved");

export const emailSchema = z.string().trim().toLowerCase().max(254).email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(200, "Password is too long");

export const displayNameSchema = z.string().trim().min(1, "Name is required").max(50, "Name is too long");

export const profileKindSchema = z.enum(["personal", "creator", "freelancer", "business"]);
export type ProfileKind = z.infer<typeof profileKindSchema>;

const optionalUrl = z
  .string()
  .trim()
  .max(200)
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || /^https?:\/\/[^\s]+$/i.test(v), "Website must start with http:// or https://");

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  handle: handleSchema,
  displayName: displayNameSchema,
  acceptGuidelines: z.literal("on", { message: "You must accept the community guidelines" }),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(200),
});

export const profileUpdateSchema = z.object({
  displayName: displayNameSchema,
  bio: z.string().trim().max(280, "Bio is limited to 280 characters"),
  location: z.string().trim().max(60),
  website: optionalUrl,
  kind: profileKindSchema,
  isPrivate: z.boolean(),
});

export const POST_MAX = 1000;
export const postSchema = z.object({
  body: z.string().trim().min(1, "Write something first").max(POST_MAX, `Posts are limited to ${POST_MAX} characters`),
  visibility: z.enum(["public", "followers"]),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").max(500, "Comments are limited to 500 characters"),
});

export const messageSchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty").max(2000, "Messages are limited to 2000 characters"),
});

export const spaceSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Slug must be at least 3 characters")
  .max(32, "Slug must be at most 32 characters")
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only");

export const spaceSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(48),
  slug: spaceSlugSchema,
  description: z.string().trim().max(280),
  visibility: z.enum(["public", "private"]),
});

export const channelNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Channel name must be at least 2 characters")
  .max(32)
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only");

export const channelSchema = z.object({
  name: channelNameSchema,
  topic: z.string().trim().max(120),
  kind: z.enum(["text", "announcements"]),
});

export const REPORT_REASONS = ["spam", "harassment", "hate", "scam_or_fraud", "impersonation", "ip_violation", "illegal", "other"] as const;
export const reportSchema = z.object({
  targetType: z.enum(["post", "comment", "user", "channel_message", "space", "rewards_entry"]),
  targetId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000),
});

/** Returns the first human-readable error from a zod result. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

const TAG_RE = /(^|[^\p{L}\p{N}_])#([\p{L}\p{N}_]{2,32})/gu;
const MENTION_RE = /(^|[^\p{L}\p{N}_@])@([a-z0-9_]{3,24})/giu;

/** Unique lowercase topic tags in a body of text. */
export function extractTags(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(TAG_RE)) out.add(m[2]!.toLowerCase());
  return [...out].slice(0, 10);
}

/** Unique lowercase @handles mentioned in a body of text. */
export function extractMentions(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(MENTION_RE)) out.add(m[2]!.toLowerCase());
  return [...out].slice(0, 10);
}

export const missionSchema = z
  .object({
    kind: z.enum(["start_business", "sell_existing"]),
    title: z.string().trim().min(3, "Give the mission a name").max(80),
    brief: z.string().trim().min(10, "Describe your idea or product in a sentence or two").max(2000),
    region: z.string().trim().min(2).max(60),
    mode: z.enum(["approve_each", "autonomous"]),
    totalCents: z.coerce.number().int().min(0).max(10000),
    perDayCents: z.coerce.number().int().min(0).max(10000),
    perTaskCents: z.coerce.number().int().min(0).max(10000),
    ownershipConfirmed: z.boolean(),
    priceCents: z.coerce.number().int().min(100, "Minimum price is €1").max(1_000_000),
    externalChannel: z.boolean().default(false),
  })
  .refine((m) => m.kind !== "sell_existing" || m.ownershipConfirmed, { message: "Confirm that you own or are authorised to sell this product", path: ["ownershipConfirmed"] })
  .refine((m) => m.perDayCents <= m.totalCents && m.perTaskCents <= m.perDayCents, { message: "Limits must satisfy per task ≤ per day ≤ total", path: ["perDayCents"] });
