/**
 * Illustrated avatars in public/avatars, cropped from a single source sheet.
 */
export interface Avatar {
  src: string;
  /** Used as alt text and as the Avatar fallback when the image fails. */
  label: string;
}

export const AVATARS = {
  manajer: { src: '/avatars/manajer.webp', label: 'Manajer' },
  akuntan: { src: '/avatars/akuntan.webp', label: 'Akuntan' },
  stafHrd: { src: '/avatars/staf-hrd.webp', label: 'Staf HRD' },
  sales: { src: '/avatars/sales.webp', label: 'Sales' },
  admin: { src: '/avatars/admin.webp', label: 'Admin' },
} as const satisfies Record<string, Avatar>;

/** The admin account shown in the dashboard sidebar. */
export const ADMIN_AVATAR = AVATARS.admin;

/**
 * The assistant in the chat. The headset reads as support, which is what the
 * bot is answering as.
 */
export const ASSISTANT_AVATAR = AVATARS.sales;

/** Everything the assistant is not, so a visitor never mirrors the bot. */
const VISITOR_AVATARS: Avatar[] = [
  AVATARS.manajer,
  AVATARS.akuntan,
  AVATARS.stafHrd,
  AVATARS.admin,
];

/**
 * Pick a stable avatar for an anonymous visitor.
 *
 * The chat has no accounts, so there is no real identity to draw — but pinning
 * the same face on every stranger looks wrong too. Deriving it from the visitor
 * id gives each browser its own consistent face across reloads without storing
 * anything, and without the server needing to know.
 */
export function avatarForVisitor(visitorId: string | undefined): Avatar | null {
  if (!visitorId) return null;

  // FNV-1a: tiny, stable, and good enough to spread ids across four buckets.
  let hash = 0x811c9dc5;
  for (let i = 0; i < visitorId.length; i++) {
    hash ^= visitorId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return VISITOR_AVATARS[hash % VISITOR_AVATARS.length];
}

/** "Admin User" -> "AU". Used when an avatar image cannot be loaded. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}
