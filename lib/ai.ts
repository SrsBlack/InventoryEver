import axios from 'axios';
import { Config } from '../constants/config';
import type { AIItemSuggestion, ReceiptData } from '../types';

// ============================================
// Google Cloud Vision + OpenAI Image Recognition
// ============================================

/**
 * Recognize a product from a base64-encoded image.
 * Uses Google Cloud Vision for detection, OpenAI for synthesis.
 */
export async function recognizeProductFromImage(
  imageBase64: string
): Promise<AIItemSuggestion> {
  if (!Config.googleVisionApiKey || !Config.openAiApiKey) {
    throw new Error('AI API keys not configured. Add them to .env.local');
  }

  // Step 1: Google Cloud Vision
  const visionResponse = await axios.post(
    `https://vision.googleapis.com/v1/images:annotate?key=${Config.googleVisionApiKey}`,
    {
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
    }
  );

  const visionResult = visionResponse.data.responses[0];
  const labels = visionResult.labelAnnotations?.map((l: { description: string; score: number }) => ({
    description: l.description,
    score: l.score,
  })) ?? [];
  const logos = visionResult.logoAnnotations?.map((l: { description: string }) => l.description) ?? [];
  const texts = visionResult.textAnnotations?.[0]?.description ?? '';
  const objects = visionResult.localizedObjectAnnotations?.map((o: { name: string }) => o.name) ?? [];

  // Step 2: OpenAI synthesis
  const openAiResponse = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an inventory assistant. Given image analysis data, return a JSON object with: name, category, brand (if detected), model (if detected), description (1 sentence), estimated_value (USD number or null), confidence (0-1).',
        },
        {
          role: 'user',
          content: `Image labels: ${labels.map((l: { description: string }) => l.description).join(', ')}\nLogos/brands: ${logos.join(', ')}\nText in image: ${texts.slice(0, 200)}\nObjects: ${objects.join(', ')}\n\nReturn JSON only.`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    },
    {
      headers: {
        Authorization: `Bearer ${Config.openAiApiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const parsed = JSON.parse(openAiResponse.data.choices[0].message.content);

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

/**
 * Parse a receipt from a base64-encoded image using Veryfi.
 */
export async function parseReceipt(imageBase64: string): Promise<ReceiptData> {
  if (!Config.veryfiClientId || !Config.veryfiApiKey) {
    throw new Error('Veryfi API keys not configured. Add them to .env.local');
  }

  const response = await axios.post(
    'https://api.veryfi.com/api/v8/partner/documents/',
    {
      file_data: imageBase64,
      categories: ['Grocery', 'Electronics', 'Office Supplies', 'Other'],
    },
    {
      headers: {
        'CLIENT-ID': Config.veryfiClientId,
        AUTHORIZATION: `apikey ${Config.veryfiUsername}:${Config.veryfiApiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const doc = response.data;

  return {
    merchant: doc.vendor?.name ?? 'Unknown Merchant',
    date: doc.date ?? new Date().toISOString().split('T')[0],
    total: doc.total ?? 0,
    subtotal: doc.subtotal ?? 0,
    tax: doc.tax ?? 0,
    payment_method: doc.payment?.type ?? 'unknown',
    receipt_number: doc.invoice_number ?? undefined,
    items: (doc.line_items ?? []).map((item: {
      description: string;
      quantity: number;
      price: number;
      total: number;
    }) => ({
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

/**
 * Transcribe audio and extract inventory details from speech.
 * audioUri: local file URI from expo-av recording.
 */
export async function transcribeVoiceToItem(
  audioUri: string
): Promise<Partial<AIItemSuggestion> & { quantity?: number; location?: string }> {
  if (!Config.openAiApiKey) {
    throw new Error('OpenAI API key not configured. Add it to .env.local');
  }

  // Fetch audio file as blob
  const response = await fetch(audioUri);
  const audioBlob = await response.blob();

  const formData = new FormData();
  formData.append('file', audioBlob, 'voice.m4a');
  formData.append('model', 'whisper-1');

  // Step 1: Transcribe
  const transcribeResponse = await axios.post(
    'https://api.openai.com/v1/audio/transcriptions',
    formData,
    {
      headers: {
        Authorization: `Bearer ${Config.openAiApiKey}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  const transcript: string = transcribeResponse.data.text;

  // Step 2: Extract structured data
  const extractResponse = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
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
    },
    {
      headers: {
        Authorization: `Bearer ${Config.openAiApiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return JSON.parse(extractResponse.data.choices[0].message.content);
}
