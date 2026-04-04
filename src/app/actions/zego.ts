
'use server';

/**
 * @fileOverview Server actions for ZegoCloud integration.
 * Handles fetching configuration for Party Rooms.
 */

const ZEGO_APP_ID = process.env.NEXT_PUBLIC_ZEGO_APP_ID;
const ZEGO_SERVER = process.env.NEXT_PUBLIC_ZEGO_SERVER;

/**
 * Returns ZegoCloud configuration.
 * Note: These environment variables must be set in Vercel or .env.local.
 */
export async function getZegoConfig() {
  if (!ZEGO_APP_ID || !ZEGO_SERVER) {
    throw new Error('ZegoCloud AppID or Server URL is missing. Please check your Environment Variables.');
  }

  return {
    appID: Number(ZEGO_APP_ID),
    server: ZEGO_SERVER,
  };
}
