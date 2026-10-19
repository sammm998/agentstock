export type PlatformRole = "user" | "moderator" | "admin";
export type SpaceRole = "owner" | "moderator" | "member";

export type SpaceAction =
  | "read"
  | "post_message"
  | "post_announcement"
  | "pin_message"
  | "delete_any_message"
  | "manage_channels"
  | "create_invite"
  | "remove_member"
  | "assign_moderator"
  | "view_mod_log"
  | "edit_space"
  | "delete_space";

const SPACE_MATRIX: Record<SpaceAction, readonly SpaceRole[]> = {
  read: ["owner", "moderator", "member"],
  post_message: ["owner", "moderator", "member"],
  post_announcement: ["owner", "moderator"],
  pin_message: ["owner", "moderator"],
  delete_any_message: ["owner", "moderator"],
  manage_channels: ["owner", "moderator"],
  create_invite: ["owner", "moderator"],
  remove_member: ["owner", "moderator"],
  assign_moderator: ["owner"],
  view_mod_log: ["owner", "moderator"],
  edit_space: ["owner"],
  delete_space: ["owner"],
};

/** Whether a space role may perform an action. `null` role means not a member. */
export function canInSpace(role: SpaceRole | null, action: SpaceAction): boolean {
  if (!role) return false;
  return SPACE_MATRIX[action].includes(role);
}

/**
 * Whether `actor` may remove `target` from a space. Owners cannot be removed,
 * and moderators may only remove plain members.
 */
export function canRemoveMember(actor: SpaceRole | null, target: SpaceRole): boolean {
  if (!canInSpace(actor, "remove_member")) return false;
  if (target === "owner") return false;
  if (actor === "moderator") return target === "member";
  return true;
}

export type PlatformAction = "view_reports" | "resolve_reports" | "remove_content" | "suspend_user" | "decide_appeals" | "adjust_sparks";

const PLATFORM_MATRIX: Record<PlatformAction, readonly PlatformRole[]> = {
  view_reports: ["moderator", "admin"],
  resolve_reports: ["moderator", "admin"],
  remove_content: ["moderator", "admin"],
  suspend_user: ["admin"],
  decide_appeals: ["admin"],
  adjust_sparks: ["admin"],
};

export function canOnPlatform(role: PlatformRole, action: PlatformAction): boolean {
  return PLATFORM_MATRIX[action].includes(role);
}

export const SPACE_PERMISSION_MATRIX = SPACE_MATRIX;
export const PLATFORM_PERMISSION_MATRIX = PLATFORM_MATRIX;
