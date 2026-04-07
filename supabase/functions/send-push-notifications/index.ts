// Supabase Edge Function — send scheduled push notifications
//
// Designed to be called by a Supabase cron job (pg_cron) once per day:
//   SELECT cron.schedule('daily-push', '0 9 * * *', $$
//     SELECT net.http_post(
//       url := 'https://senmpagpravittvayecz.supabase.co/functions/v1/send-push-notifications',
//       headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}',
//       body := '{}'
//     );
//   $$);
//
// Or triggered manually via: supabase functions invoke send-push-notifications --project-ref senmpagpravittvayecz
//
// Sends:
//   - Warranty expiring in ≤ 7 days
//   - Maintenance due in ≤ 3 days
//   - Overdue lending (Phase 4 — queries lending_records once that table exists)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExpoPushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  badge?: number;
}

async function sendPushBatch(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  // Expo push API accepts batches of up to 100
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const today = new Date();
  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(today.getDate() + 7);

  const threeDaysOut = new Date(today);
  threeDaysOut.setDate(today.getDate() + 3);

  const messages: ExpoPushMessage[] = [];

  // ── Warranty Reminders ────────────────────────────────────────────────────
  const { data: warrantyItems } = await supabase
    .from('items')
    .select('id, name, warranty_expiry_date, workspace_id, workspace:workspaces(owner_id)')
    .not('warranty_expiry_date', 'is', null)
    .gte('warranty_expiry_date', today.toISOString().split('T')[0])
    .lte('warranty_expiry_date', sevenDaysOut.toISOString().split('T')[0]);

  if (warrantyItems && warrantyItems.length > 0) {
    const userIds = [...new Set(warrantyItems.map((i: { workspace: { owner_id: string } }) => i.workspace?.owner_id).filter(Boolean))];

    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('user_id, token')
      .in('user_id', userIds);

    const tokenMap = new Map<string, string[]>();
    (tokens ?? []).forEach((t: { user_id: string; token: string }) => {
      const list = tokenMap.get(t.user_id) ?? [];
      list.push(t.token);
      tokenMap.set(t.user_id, list);
    });

    for (const item of warrantyItems) {
      const userId = (item.workspace as { owner_id: string })?.owner_id;
      const userTokens = tokenMap.get(userId) ?? [];
      const expiry = new Date(item.warranty_expiry_date);
      const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);

      for (const token of userTokens) {
        messages.push({
          to: token,
          title: 'Warranty Expiring Soon',
          body: `${item.name}'s warranty expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
          data: { type: 'warranty', itemId: item.id },
          sound: 'default',
        });
      }
    }
  }

  // ── Maintenance Reminders ─────────────────────────────────────────────────
  const { data: maintenanceLogs } = await supabase
    .from('maintenance_logs')
    .select('id, item_id, next_scheduled_date, items!inner(id, name, workspace_id, workspace:workspaces(owner_id))')
    .not('next_scheduled_date', 'is', null)
    .gte('next_scheduled_date', today.toISOString().split('T')[0])
    .lte('next_scheduled_date', threeDaysOut.toISOString().split('T')[0]);

  if (maintenanceLogs && maintenanceLogs.length > 0) {
    const userIds = [...new Set(
      maintenanceLogs
        .map((m: { items: { workspace: { owner_id: string } } }) => m.items?.workspace?.owner_id)
        .filter(Boolean)
    )];

    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('user_id, token')
      .in('user_id', userIds);

    const tokenMap = new Map<string, string[]>();
    (tokens ?? []).forEach((t: { user_id: string; token: string }) => {
      const list = tokenMap.get(t.user_id) ?? [];
      list.push(t.token);
      tokenMap.set(t.user_id, list);
    });

    for (const log of maintenanceLogs) {
      const userId = (log.items as { workspace: { owner_id: string } })?.workspace?.owner_id;
      const userTokens = tokenMap.get(userId) ?? [];
      const dueDate = new Date(log.next_scheduled_date);
      const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);

      for (const token of userTokens) {
        messages.push({
          to: token,
          title: 'Maintenance Due Soon',
          body: `${(log.items as { name: string }).name} needs service in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
          data: { type: 'maintenance', itemId: log.item_id },
          sound: 'default',
        });
      }
    }
  }

  // ── Overdue Lending Reminders ─────────────────────────────────────────────
  const { data: overdueLoans } = await supabase
    .from('lending_records')
    .select('id, item_id, borrower_name, expected_return_date, created_by, items!inner(id, name)')
    .is('returned_at', null)
    .not('expected_return_date', 'is', null)
    .lt('expected_return_date', today.toISOString().split('T')[0]);

  if (overdueLoans && overdueLoans.length > 0) {
    const userIds = [...new Set(overdueLoans.map((l: { created_by: string }) => l.created_by).filter(Boolean))];

    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('user_id, token')
      .in('user_id', userIds);

    const tokenMap = new Map<string, string[]>();
    (tokens ?? []).forEach((t: { user_id: string; token: string }) => {
      const list = tokenMap.get(t.user_id) ?? [];
      list.push(t.token);
      tokenMap.set(t.user_id, list);
    });

    for (const loan of overdueLoans) {
      const userTokens = tokenMap.get((loan as { created_by: string }).created_by) ?? [];
      const itemName = (loan.items as { name: string }).name;
      const daysOverdue = Math.ceil(
        (today.getTime() - new Date(loan.expected_return_date).getTime()) / 86400000
      );

      for (const token of userTokens) {
        messages.push({
          to: token,
          title: 'Item Not Returned',
          body: `${itemName} lent to ${(loan as { borrower_name: string }).borrower_name} is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue.`,
          data: { type: 'lending', lendingId: loan.id },
          sound: 'default',
        });
      }

      // Update reminder_sent_at to avoid spamming daily
      await supabase
        .from('lending_records')
        .update({ reminder_sent_at: today.toISOString() })
        .eq('id', loan.id);
    }
  }

  // ── Send all messages ─────────────────────────────────────────────────────
  await sendPushBatch(messages);

  return new Response(
    JSON.stringify({ sent: messages.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
