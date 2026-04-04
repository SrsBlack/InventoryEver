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
    const response = await fetch(`data:image/jpeg;base64,${base64OrBlob}`);
    uploadData = await response.blob();
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
