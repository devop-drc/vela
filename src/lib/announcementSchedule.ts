// Client mirror of the storefront's announcement schedule logic (the
// `isRecurringActive` check in the get-public-shop-data edge function). The
// storefront only shows an announcement when it is BOTH is_active AND currently
// within its (optionally recurring) date window. The admin uses this so its
// preview and status badges match exactly what customers see — otherwise an
// announcement toggled "active" but outside its schedule looks live in the
// dashboard yet never appears on the shop.

export interface AnnouncementLike {
  is_active?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  repeat_interval?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none' | null;
}

/** Is `now` inside the announcement's (possibly recurring) date window? Mirrors
    the edge function's UTC-normalized comparison exactly. */
export function isWithinSchedule(a: AnnouncementLike, now: Date = new Date()): boolean {
  const start = a.start_date ? new Date(a.start_date) : null;
  const end = a.end_date ? new Date(a.end_date) : null;
  const repeat = a.repeat_interval ?? null;

  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  // Absolute window bounds.
  if (start && todayEnd.getTime() < start.getTime()) return false;
  if (end && todayStart.getTime() > end.getTime()) return false;

  // No recurrence → passing the absolute window is enough.
  if (!repeat || repeat === 'none') return true;
  if (!start) return false; // recurring needs an anchor date

  const sM = start.getUTCMonth(), sD = start.getUTCDate();
  const eM = end ? end.getUTCMonth() : sM, eD = end ? end.getUTCDate() : sD;
  const cM = todayStart.getUTCMonth(), cD = todayStart.getUTCDate();

  switch (repeat) {
    case 'daily':
      return true;
    case 'weekly':
      return todayStart.getUTCDay() === start.getUTCDay();
    case 'monthly':
      return sD <= eD ? (cD >= sD && cD <= eD) : (cD >= sD || cD <= eD);
    case 'yearly': {
      const afterStart = cM > sM || (cM === sM && cD >= sD);
      const beforeEnd = cM < eM || (cM === eM && cD <= eD);
      return sM <= eM ? (afterStart && beforeEnd) : (afterStart || beforeEnd);
    }
    default:
      return false;
  }
}

/** Live right now on the storefront = enabled AND within schedule. */
export function isAnnouncementLiveNow(a: AnnouncementLike, now: Date = new Date()): boolean {
  return a.is_active !== false && isWithinSchedule(a, now);
}

export type AnnouncementStatus = 'off' | 'live' | 'scheduled' | 'expired';

/** Human-facing status for the admin list. */
export function announcementStatus(a: AnnouncementLike, now: Date = new Date()): AnnouncementStatus {
  if (a.is_active === false) return 'off';
  if (isWithinSchedule(a, now)) return 'live';
  // Enabled but outside its window — before the start = scheduled, else expired.
  const start = a.start_date ? new Date(a.start_date) : null;
  if (start && now.getTime() < start.getTime() && (!a.repeat_interval || a.repeat_interval === 'none')) {
    return 'scheduled';
  }
  return 'expired';
}
