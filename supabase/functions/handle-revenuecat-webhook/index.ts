// Supabase Edge Function — RevenueCat webhook handler
// FIX(audit-2026-05-09 #I-followup) — closes the empty-directory gap.
//
// Deploy:
//   supabase functions deploy handle-revenuecat-webhook --no-verify-jwt --project-ref <your-project-ref>
//   (no-verify-jwt because RevenueCat calls us with its own auth header, not a Supabase user JWT)
//
// Set secrets:
//   supabase secrets set REVENUECAT_WEBHOOK_AUTH=<random-token> --project-ref <your-project-ref>
//
// Then in RevenueCat dashboard -> Integrations -> Webhooks, set:
//   URL:    https://<project-ref>.supabase.co/functions/v1/handle-revenuecat-webhook
//   Header: Authorization: Bearer <random-token>   (must match REVENUECAT_WEBHOOK_AUTH)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RevenueCatEvent {
  id: string;
  type:
    | 'INITIAL_PURCHASE'
    | 'RENEWAL'
    | 'CANCELLATION'
    | 'EXPIRATION'
    | 'BILLING_ISSUE'
    | 'PRODUCT_CHANGE'
    | 'NON_RENEWING_PURCHASE'
    | 'SUBSCRIBER_ALIAS'
    | 'TRANSFER'
    | 'UNCANCELLATION'
    | string;
  app_user_id: string;
  product_id?: string;
  entitlement_ids?: string[];
  event_timestamp_ms?: number;
}

interface RevenueCatPayload {
  api_version: string;
  event: RevenueCatEvent;
}

// Map an entitlement_id (e.g. "pro", "business") onto our subscription_tier enum.
// Falls through to 'pro' if the entitlement is unknown but the event indicates entitlement.
function tierForEntitlement(entitlementIds: string[] | undefined): 'free' | 'pro' | 'business' {
  if (!entitlementIds || entitlementIds.length === 0) return 'free';
  if (entitlementIds.includes('business')) return 'business';
  if (entitlementIds.includes('pro')) return 'pro';
  return 'pro';
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Shared-secret auth (RevenueCat-configured Authorization header).
  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  if (!expected) {
    console.error('[rc-webhook] REVENUECAT_WEBHOOK_AUTH not set; refusing to process.');
    return new Response('Server misconfigured', { status: 500 });
  }
  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader !== `Bearer ${expected}`) {
    console.warn('[rc-webhook] bad auth header');
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: RevenueCatPayload;
  try {
    payload = await req.json() as RevenueCatPayload;
  } catch (err) {
    console.error('[rc-webhook] invalid JSON body', err);
    return new Response('Bad request', { status: 400 });
  }

  const event = payload.event;
  if (!event?.type || !event?.app_user_id) {
    return new Response('Missing event fields', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Idempotency check — bail if we have already processed this event.id.
  // Requires a processed_webhooks(event_id TEXT PRIMARY KEY, processed_at TIMESTAMPTZ) table.
  // The insert-then-select pattern keeps it race-free under concurrent retries.
  const { error: idemError } = await supabase
    .from('processed_webhooks')
    .insert({ event_id: event.id, processed_at: new Date().toISOString() });
  if (idemError && idemError.code === '23505') {
    // Unique violation — already processed. RevenueCat retry: ack with 200.
    return new Response('OK (duplicate)', { status: 200 });
  }
  if (idemError) {
    console.error('[rc-webhook] idempotency check failed', idemError);
    // Continue anyway — better to double-process than to lose an event.
  }

  // Resolve our user. RevenueCat uses app_user_id; we either stored that on profiles
  // directly (revenuecat_user_id) or the client called Purchases.logIn(profiles.id),
  // in which case app_user_id === profiles.id. Handle both.
  let userId: string | null = null;

  // Try app_user_id as our profile UUID first (the modern pattern).
  if (/^[0-9a-f-]{36}$/i.test(event.app_user_id)) {
    userId = event.app_user_id;
  } else {
    const { data: byRcId } = await supabase
      .from('profiles')
      .select('id')
      .eq('revenuecat_user_id', event.app_user_id)
      .maybeSingle();
    userId = byRcId?.id ?? null;
  }

  if (!userId) {
    console.warn('[rc-webhook] no profile matched app_user_id', event.app_user_id);
    return new Response('OK (no matching profile)', { status: 200 });
  }

  // Determine the next subscription_tier based on event type.
  let nextTier: 'free' | 'pro' | 'business' | null = null;

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
    case 'NON_RENEWING_PURCHASE':
      nextTier = tierForEntitlement(event.entitlement_ids);
      break;

    case 'CANCELLATION':
      // RevenueCat fires CANCELLATION when auto-renew is turned off; access continues
      // until EXPIRATION. Do not downgrade here.
      nextTier = null;
      break;

    case 'EXPIRATION':
      nextTier = 'free';
      break;

    case 'BILLING_ISSUE':
      // Stay on current tier through the grace period; only flip to 'free' on
      // EXPIRATION if RC doesn't recover the charge.
      nextTier = null;
      break;

    case 'SUBSCRIBER_ALIAS':
    case 'TRANSFER':
      // Account merging — out of scope here.
      nextTier = null;
      break;

    default:
      console.warn('[rc-webhook] unhandled event type', event.type);
      nextTier = null;
  }

  if (nextTier === null) {
    return new Response(`OK (${event.type} acknowledged, no tier change)`, { status: 200 });
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      subscription_tier: nextTier,
      revenuecat_user_id: event.app_user_id,
    })
    .eq('id', userId);

  if (updateError) {
    console.error('[rc-webhook] profile update failed', updateError);
    return new Response('Update failed', { status: 500 });
  }

  console.log(`[rc-webhook] ${event.type} -> ${nextTier} for ${userId}`);
  return new Response(`OK (${event.type} -> ${nextTier})`, { status: 200 });
});
