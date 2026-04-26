
import { supabase } from './supabase';

/**
 * Uploads a base64 image string to Supabase Storage 'photos' bucket and returns the public URL.
 * @param base64 The image as a data URI.
 * @param path The path in the bucket (e.g., 'profiles/user123/avatar.jpg').
 */
export async function uploadToSupabase(base64: string, path: string): Promise<string> {
  try {
    // Convert base64 data URL to Blob
    const response = await fetch(base64);
    const blob = await response.blob();

    // The user specified the bucket name is 'photos'
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      throw error;
    }

    // Generate the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(path);

    return publicUrl;
  } catch (err: any) {
    console.error('Supabase Storage upload error:', err);
    throw new Error(err.message || 'Failed to upload image to Supabase.');
  }
}
