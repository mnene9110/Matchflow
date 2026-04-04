'use server';

/**
 * @fileOverview Server actions for ZegoCloud integration.
 * Handles fetching configuration for Party Rooms.
 */

const ZEGO_APP_ID = process.env.NEXT_PUBLIC_ZEGO_APP_ID;
const ZEGO_SERVER = process.env.NEXT_PUBLIC_ZEGO_SERVER;

/**
 * Returns ZegoCloud configuration.
 * Improved error message to guide the user on environment setup.
 */
export async function getZegoConfig() {
  if (!ZEGO_APP_ID || !ZEGO_SERVER) {
    throw new Error('ZegoCloud environment variables are missing. Please add NEXT_PUBLIC_ZEGO_APP_ID and NEXT_PUBLIC_ZEGO_SERVER to your project settings (Vercel or .env).');
  }

  return {
    appID: Number(ZEGO_APP_ID),
    server: ZEGO_SERVER,
  };
}
