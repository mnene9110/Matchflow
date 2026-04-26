
import { supabase } from './supabase';

/**
 * Converts a Base64 or Data URI string to a File object.
 */
function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Uploads a base64 image string to Supabase Storage and returns the public URL.
 * @param base64 The image as a data URI.
 * @param path The path in the bucket (e.g., 'profiles/user123/avatar.jpg').
 */
export async function uploadToSupabase(base64: string, path: string): Promise<string> {
  const file = dataURLtoFile(base64, 'upload.jpg');
  
  const { data, error } = await supabase.storage
    .from('photos') // Make sure this bucket exists and is public
    .upload(path, file, {
      upsert: true,
      contentType: file.type
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error('Failed to upload image to storage.');
  }

  const { data: { publicUrl } } = supabase.storage
    .from('photos')
    .getPublicUrl(path);

  return publicUrl;
}
