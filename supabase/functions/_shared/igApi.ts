/**
 * Provider-aware Instagram Graph access.
 *
 * Two token families coexist in `integrations`:
 *  - provider 'instagram' — Instagram API with Instagram Login (direct IG
 *    login, current flow). Calls go to graph.instagram.com and the account
 *    id comes straight from the integration row (or /me).
 *  - provider 'facebook' — legacy Facebook-Login flow (old Meta app, being
 *    phased out). Calls go to graph.facebook.com and the IG account id is
 *    discovered through the user's Facebook Pages.
 *
 * Fetch the newest integration for a user with `getIntegration`, then build
 * URLs through the helpers so each edge function stays provider-agnostic.
 */

export const IG_GRAPH = 'https://graph.instagram.com';
export const FB_GRAPH = 'https://graph.facebook.com/v19.0';

export interface IgIntegration {
  provider: 'instagram' | 'facebook' | string;
  access_token: string;
  ig_account_id: string | null;
  token_expires_at?: string | null;
}

/** Prefer the new direct-IG connection when a user has both providers. */
export async function getIntegration(admin: any, userId: string): Promise<IgIntegration | null> {
  const { data } = await admin.from('integrations')
    .select('provider, access_token, ig_account_id, token_expires_at')
    .eq('user_id', userId)
    .in('provider', ['instagram', 'facebook']);
  if (!data?.length) return null;
  return data.find((r: IgIntegration) => r.provider === 'instagram') ?? data[0];
}

/** Resolve the IG account id (legacy rows may need Pages discovery). */
export async function resolveIgAccountId(integration: IgIntegration): Promise<string | null> {
  if (integration.ig_account_id) return String(integration.ig_account_id);
  if (integration.provider === 'instagram') {
    const res = await fetch(`${IG_GRAPH}/me?fields=user_id&access_token=${integration.access_token}`);
    const data = await res.json();
    return res.ok && data.user_id ? String(data.user_id) : null;
  }
  const res = await fetch(`${FB_GRAPH}/me/accounts?fields=instagram_business_account&access_token=${integration.access_token}`);
  const data = await res.json();
  if (!res.ok) return null;
  return data.data?.find((p: any) => p.instagram_business_account)?.instagram_business_account?.id ?? null;
}

const base = (i: IgIntegration) => (i.provider === 'instagram' ? IG_GRAPH : FB_GRAPH);

/** Media list for the account. `since` is a unix timestamp (optional). */
export const mediaListUrl = (i: IgIntegration, igId: string, fields: string, since?: number | null) =>
  `${base(i)}/${igId}/media?fields=${fields}&access_token=${i.access_token}&limit=100${since ? `&since=${since}` : ''}`;

/** A single media object. */
export const mediaItemUrl = (i: IgIntegration, mediaId: string, fields: string) =>
  `${base(i)}/${mediaId}?fields=${fields}&access_token=${i.access_token}`;

/** Children of a carousel media object. */
export const mediaChildrenUrl = (i: IgIntegration, mediaId: string, fields: string) =>
  `${base(i)}/${mediaId}/children?fields=${fields}&access_token=${i.access_token}`;

/**
 * Profile URL. The two APIs expose slightly different field names —
 * pass the field list per provider when they diverge.
 */
export const profileUrl = (i: IgIntegration, igId: string, fields: string) =>
  i.provider === 'instagram'
    ? `${IG_GRAPH}/me?fields=${fields}&access_token=${i.access_token}`
    : `${FB_GRAPH}/${igId}?fields=${fields}&access_token=${i.access_token}`;

/** Content-publishing endpoints (same container flow on both APIs). */
export const mediaContainerUrl = (i: IgIntegration, igId: string) => `${base(i)}/${igId}/media`;
export const mediaPublishUrl = (i: IgIntegration, igId: string) => `${base(i)}/${igId}/media_publish`;
export const containerStatusUrl = (i: IgIntegration, containerId: string) =>
  `${base(i)}/${containerId}?fields=status_code&access_token=${i.access_token}`;
