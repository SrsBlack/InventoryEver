# Applying Migrations — Supabase Project `senmpagpravittvayecz`

## Step 1: Open the SQL Editor

Go to the [Supabase Dashboard](https://supabase.com/dashboard/project/senmpagpravittvayecz) and open **SQL Editor**.

## Step 2: Run Migrations in Order

Paste and execute each file in sequence. Skip any already applied.

1. `006_collections.sql` — if not already applied
2. `007_device_tokens_and_rpc.sql`
3. `008_delete_account_rpc.sql`
4. `009_workspace_invites.sql`
5. `010_pg_cron_setup.sql` — see prerequisites in Step 7 before running this one

## Step 3: Verify

- **Tables**: confirm `device_tokens` and `workspace_invites` appear under Table Editor
- **Functions**: confirm `increment_usage` and `delete_account` appear under Database → Functions

## Step 4: Create the `item-images` Storage Bucket

1. Dashboard → **Storage** → **New bucket**
2. Name: `item-images`
3. Public: **ON**
4. Click **Create bucket**

## Step 5: Deploy Edge Functions

Run from the project root (requires Supabase CLI logged in):

```bash
supabase functions deploy process-ai-request --project-ref senmpagpravittvayecz
supabase functions deploy send-push-notifications --project-ref senmpagpravittvayecz
```

## Step 6: Set Edge Function Secrets

```bash
supabase secrets set \
  OPENAI_API_KEY=... \
  GOOGLE_VISION_API_KEY=... \
  VERYFI_CLIENT_ID=... \
  VERYFI_API_KEY=... \
  VERYFI_USERNAME=... \
  --project-ref senmpagpravittvayecz
```

Replace each `...` with the real value before running.

## Step 7: Enable pg_cron and Apply `010_pg_cron_setup.sql`

1. Dashboard → **Database** → **Extensions** → search `pg_cron` → **Enable**
2. Set the service role key so the cron job can call Edge Functions:

```sql
ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key';
```

Replace `your-service-role-key` with the value from Dashboard → **Project Settings** → **API** → **service_role** key.

3. Return to SQL Editor and run `010_pg_cron_setup.sql`.

## Verification Queries

```sql
-- Confirm scheduled jobs
SELECT * FROM cron.job;

-- Unschedule if needed
SELECT cron.unschedule('send-daily-push-notifications');
SELECT cron.unschedule('generate-warranty-alerts');
```
