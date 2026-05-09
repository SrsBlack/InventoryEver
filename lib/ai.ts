import { z } from 'zod';
import { supabase } from './supabase';
import type { AIItemSuggestion, ReceiptData } from '../types';

// FIX(audit-2026-05-09 #I8) — Zod schemas for AI response boundaries; prevents unknown→number crashes
const AIItemSuggestionSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  description: z.string().optional(),
  estimated_value: z.number().optional(),
  confidence: z.number().optional(),
});

const VoiceExtractionSchema = z.object({
  name: z.string().optional(),
  quantity: z.number().optional(),
  location: z.string().optional(),
  brand: z.string().optional(),
  estimated_value: z.number().optional(),
  description: z.string().optional(),
});

// All AI calls are proxied through the Supabase Edge Function 'process-ai-request'.
// API keys live server-side — never in the client bundle.

async function invokeAI<T>(type: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('process-ai-request', {
    body: { type, payload },
  });
  if (error) throw error;
  return data as T;
}

// ============================================
// Google Cloud Vision + OpenAI Image Recognition
// ============================================

export async function recognizeProductFromImage(
  imageBase64: string
): Promise<AIItemSuggestion> {
  // Step 1: Google Cloud Vision
  const visionData = await invokeAI<{ responses: Array<{
    labelAnnotations?: Array<{ description: string; score: number }>;
    logoAnnotations?: Array<{ description: string }>;
    textAnnotations?: Array<{ description: string }>;
    localizedObjectAnnotations?: Array<{ name: string }>;
  }> }>('vision', {
    requests: [
      {
        image: { content: imageBase64 },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'OBJECT_LOCALIZATION', maxResults: 5 },
          { type: 'LOGO_DETECTION', maxResults: 5 },
          { type: 'TEXT_DETECTION', maxResults: 1 },
        ],
      },
    ],
  });

  const visionResult = visionData.responses[0];
  const labels = visionResult.labelAnnotations?.map(l => ({ description: l.description, score: l.score })) ?? [];
  const logos = visionResult.logoAnnotations?.map(l => l.description) ?? [];
  const texts = visionResult.textAnnotations?.[0]?.description ?? '';
  const objects = visionResult.localizedObjectAnnotations?.map(o => o.name) ?? [];

  // Step 2: OpenAI synthesis
  const gptData = await invokeAI<{ choices: Array<{ message: { content: string } }> }>('gpt', {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are an inventory assistant. Given image analysis data, return a JSON object with: name, category, brand (if detected), model (if detected), description (1 sentence), estimated_value (USD number or null), confidence (0-1).',
      },
      {
        role: 'user',
        content: `Image labels: ${labels.map(l => l.description).join(', ')}\nLogos/brands: ${logos.join(', ')}\nText in image: ${texts.slice(0, 200)}\nObjects: ${objects.join(', ')}\n\nReturn JSON only.`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 300,
  });

  let parsed: z.infer<typeof AIItemSuggestionSchema>;
  try {
    parsed = AIItemSuggestionSchema.parse(JSON.parse(gptData.choices[0].message.content));
  } catch {
    parsed = {};
  }

  return {
    name: parsed.name ?? 'Unknown Item',
    category: parsed.category ?? 'Other',
    brand: parsed.brand ?? undefined,
    model: parsed.model ?? undefined,
    description: parsed.description ?? undefined,
    estimated_value: parsed.estimated_value ?? undefined,
    confidence: parsed.confidence ?? 0.5,
  };
}

// ============================================
// Veryfi Receipt OCR
// ============================================

export async function parseReceipt(imageBase64: string): Promise<ReceiptData> {
  const doc = await invokeAI<{
    vendor?: { name?: string };
    date?: string;
    total?: number;
    subtotal?: number;
    tax?: number;
    payment?: { type?: string };
    invoice_number?: string;
    line_items?: Array<{ description: string; quantity: number; price: number; total: number }>;
  }>('veryfi', {
    file_data: imageBase64,
    categories: ['Grocery', 'Electronics', 'Office Supplies', 'Other'],
  });

  return {
    merchant: doc.vendor?.name ?? 'Unknown Merchant',
    date: doc.date ?? new Date().toISOString().split('T')[0],
    total: doc.total ?? 0,
    subtotal: doc.subtotal ?? 0,
    tax: doc.tax ?? 0,
    payment_method: doc.payment?.type ?? 'unknown',
    receipt_number: doc.invoice_number ?? undefined,
    items: (doc.line_items ?? []).map(item => ({
      description: item.description,
      quantity: item.quantity ?? 1,
      unit_price: item.price ?? 0,
      total: item.total ?? 0,
    })),
  };
}

// ============================================
// OpenAI Whisper Voice Transcription
// ============================================

export async function transcribeVoiceToItem(
  audioUri: string
): Promise<Partial<AIItemSuggestion> & { quantity?: number; location?: string }> {
  // Fetch audio and convert to base64 to send through Edge Function
  const response = await fetch(audioUri);
  const audioBuffer = await response.arrayBuffer();
  // FIX(audit-2026-05-09 #3) — build binary string in chunks then btoa once; was double-encoding
  const bytes = new Uint8Array(audioBuffer);
  let audioBinary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    audioBinary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const audioBase64 = btoa(audioBinary);

  // Step 1: Transcribe via Whisper
  const transcribeData = await invokeAI<{ text: string }>('whisper', { audio: audioBase64 });
  const transcript = transcribeData.text;

  // Step 2: Extract structured data via GPT
  const extractData = await invokeAI<{ choices: Array<{ message: { content: string } }> }>('gpt', {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Extract inventory item details from the speech. Return JSON with: name, quantity (number), location, brand, estimated_value (number or null), description.',
      },
      { role: 'user', content: transcript },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 200,
  });

  try {
    return VoiceExtractionSchema.parse(JSON.parse(extractData.choices[0].message.content));
  } catch {
    return {};
  }
}
