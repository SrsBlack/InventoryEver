import { supabase } from './supabase';
import { Config } from '../constants/config';

/**
 * Upload an image (base64 or blob) to Supabase Storage and return public URL.
 */
export async function uploadItemImage(
  userId: string,
  base64OrBlob: string | Blob,
  itemId?: string
): Promise<string> {
  const folder = itemId ?? 'temp';
  const fileName = `${userId}/${folder}/${Date.now()}.jpg`;

  let uploadData: Blob;
  if (typeof base64OrBlob === 'string') {
    // base64OrBlob is a raw base64 string (not a file URI)
    const binaryStr = atob(base64OrBlob);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    uploadData = new Blob([bytes], { type: 'image/jpeg' });
  } else {
    uploadData = base64OrBlob;
  }

  const { error } = await supabase.storage
    .from(Config.storageBucket)
    .upload(fileName, uploadData, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(Config.storageBucket)
    .getPublicUrl(fileName);

  return data.publicUrl;
}

/**
 * Delete an image from Supabase Storage by URL.
 */
export async function deleteItemImage(imageUrl: string): Promise<void> {
  // Extract path from public URL
  const url = new URL(imageUrl);
  const pathParts = url.pathname.split(`/storage/v1/object/public/${Config.storageBucket}/`);
  if (pathParts.length < 2) return;

  const filePath = pathParts[1];
  const { error } = await supabase.storage
    .from(Config.storageBucket)
    .remove([filePath]);

  if (error) throw error;
}

/**
 * Get a signed URL for a private storage item (if bucket is private).
 */
export async function getSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(Config.storageBucket)
    .createSignedUrl(filePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}
