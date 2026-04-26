
import { initializeFirebase } from '@/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a base64 image string to Firebase Storage and returns the public URL.
 * @param base64 The image as a data URI.
 * @param path The path in the bucket (e.g., 'profiles/user123/avatar.jpg').
 */
export async function uploadToSupabase(base64: string, path: string): Promise<string> {
  // Maintaining the function name for compatibility with existing components
  try {
    const { storage } = initializeFirebase();
    const storageRef = ref(storage, path);
    
    // uploadString handles data_url format
    const snapshot = await uploadString(storageRef, base64, 'data_url');
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (err: any) {
    console.error('Firebase Storage helper failed:', err);
    throw new Error(err.message || 'Failed to upload image to storage.');
  }
}
