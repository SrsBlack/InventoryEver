// Supabase Edge Function — AI request proxy
// Keeps API keys server-side; validates user JWT before proxying.
// Deploy: supabase functions deploy process-ai-request --project-ref senmpagpravittvayecz
// Set secrets: supabase secrets set OPENAI_API_KEY=... GOOGLE_VISION_API_KEY=... --project-ref senmpagpravittvayecz

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate user JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as {
      type: 'vision' | 'gpt' | 'whisper' | 'veryfi';
      payload: Record<string, unknown>;
    };

    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    const googleVisionKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    const veryfiClientId = Deno.env.get('VERYFI_CLIENT_ID');
    const veryfiApiKey = Deno.env.get('VERYFI_API_KEY');
    const veryfiUsername = Deno.env.get('VERYFI_USERNAME');

    let result: unknown;

    switch (body.type) {
      case 'vision': {
        const visionRes = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${googleVisionKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body.payload),
          }
        );
        result = await visionRes.json();
        break;
      }

      case 'gpt': {
        const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openAiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body.payload),
        });
        result = await gptRes.json();
        break;
      }

      case 'whisper': {
        // payload.formData is base64-encoded m4a; rebuild FormData on server
        const audioBase64 = body.payload.audio as string;
        const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
        const formData = new FormData();
        formData.append('file', new Blob([audioBytes], { type: 'audio/m4a' }), 'voice.m4a');
        formData.append('model', 'whisper-1');

        const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openAiKey}` },
          body: formData,
        });
        result = await whisperRes.json();
        break;
      }

      case 'veryfi': {
        const veryfiRes = await fetch('https://api.veryfi.com/api/v8/partner/documents/', {
          method: 'POST',
          headers: {
            'CLIENT-ID': veryfiClientId!,
            AUTHORIZATION: `apikey ${veryfiUsername}:${veryfiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body.payload),
        });
        result = await veryfiRes.json();
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown request type: ${body.type}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
