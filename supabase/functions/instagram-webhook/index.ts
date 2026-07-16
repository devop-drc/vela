import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  const url = new URL(req.url);

  // GET: webhook verification
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const verifyToken = Deno.env.get('IG_WEBHOOK_VERIFY_TOKEN');

    if (mode === 'subscribe' && token && token === verifyToken && challenge) {
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response('Forbidden', { status: 403, headers: corsHeaders });
  }

  // POST: handle changes
  if (req.method === 'POST') {
    try {
      const body = await req.json();

      if (!body.entry || !Array.isArray(body.entry)) {
        return new Response('ignored', { status: 200, headers: corsHeaders });
      }

      for (const entry of body.entry) {
        // For ig_user subscription, entry.id is the IG account ID
        const igAccountId = entry.id;
        if (!igAccountId) continue;

        // Find integration to get user + access token
        const { data: integration } = await supabase
          .from('integrations')
          .select('user_id, access_token')
          .eq('provider', 'facebook')
          .eq('ig_account_id', igAccountId)
          .maybeSingle();

        if (!integration) continue;

        // New post published → kick off a quick sync automatically so the
        // product appears without the merchant doing anything. Debounced: skip
        // when a sync is already running for this user.
        const changes: any[] = entry.changes || [];
        const hasNewMedia = changes.some((c: any) =>
          c?.field === 'media' || c?.field === 'feed' || c?.value?.media_id || c?.value?.id
        );
        if (hasNewMedia) {
          try {
            const { data: running } = await supabase
              .from('sync_jobs')
              .select('id')
              .eq('user_id', integration.user_id)
              .in('status', ['starting', 'in_progress'])
              .limit(1);
            if (!running?.length) {
              // Service-role invoke → background-sync's internal auth path.
              const { error: syncErr } = await supabase.functions.invoke('background-sync', {
                body: { syncType: 'quick', user_id: integration.user_id },
              });
              if (syncErr) console.error('Webhook auto-sync failed to start:', syncErr.message);
              else console.log(`Webhook auto-sync started for user ${integration.user_id}`);
            }
          } catch (e) {
            console.error('Webhook auto-sync error:', (e as Error).message);
          }
        }

        const accessToken = integration.access_token as string;

        // Fetch latest profile details from Graph API
        const fields = 'name,username,profile_picture_url,biography,followers_count,media_count,website';
        const profileRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}?fields=${fields}&access_token=${accessToken}`);
        if (!profileRes.ok) continue;
        const profile = await profileRes.json();

        // Upload profile picture deterministically
        let uploadedLogoUrl: string | null = null;
        if (profile.profile_picture_url) {
          try {
            const img = await fetch(profile.profile_picture_url);
            if (img.ok) {
              const blob = await img.blob();
              const fileName = `${integration.user_id}/profile.jpg`;
              const { error: uploadErr } = await supabase.storage
                .from('shop-assets')
                .upload(fileName, blob, {
                  contentType: img.headers.get('content-type') || 'image/jpeg',
                  upsert: true,
                });
              if (!uploadErr) {
                const { data: publicUrlData } = supabase.storage.from('shop-assets').getPublicUrl(fileName);
                uploadedLogoUrl = publicUrlData.publicUrl;
              }
            }
          } catch (e) {
            console.error('Failed to upload IG profile image from webhook:', (e as Error).message);
          }
        }

        // Update shop_details via ig_account_id mapping
        const updates: Record<string, any> = {
          shop_name: profile.name ?? undefined,
          about: profile.biography ?? undefined,
          followers_count: profile.followers_count ?? undefined,
          media_count: profile.media_count ?? undefined,
          instagram_url: profile.username ? `https://www.instagram.com/${profile.username}` : undefined,
          username: profile.username ?? undefined,
        };
        if (uploadedLogoUrl) {
          updates.logo_url = uploadedLogoUrl;
          updates.favicon_url = uploadedLogoUrl;
        }

        const { data: shop } = await supabase
          .from('shop_details')
          .select('business_id')
          .eq('ig_account_id', igAccountId)
          .maybeSingle();

        if (shop?.business_id) {
          await supabase.from('shop_details').update(updates).eq('business_id', shop.business_id);
        }
      }

      return new Response('ok', { status: 200, headers: corsHeaders });
    } catch (e) {
      console.error('instagram-webhook error:', (e as Error).message);
      return new Response('error', { status: 500, headers: corsHeaders });
    }
  }

  return new Response('method not allowed', { status: 405, headers: corsHeaders });
});
