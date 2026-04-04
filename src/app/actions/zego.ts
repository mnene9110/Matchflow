
'use server';

/**
 * @fileOverview Server actions for ZegoCloud integration.
 * Handles fetching configuration for Party Rooms.
 */

const ZEGO_APP_ID = process.env.NEXT_PUBLIC_ZEGO_APP_ID;
const ZEGO_SERVER = process.env.NEXT_PUBLIC_ZEGO_SERVER;

/**
 * Returns ZegoCloud configuration.
 * Note: In a production app, you should generate a temporary token here 
 * using the ServerSecret, rather than passing raw credentials.
 */
export async function getZegoConfig() {
  if (!ZEGO_APP_ID || !ZEGO_SERVER) {
    throw new Error('ZegoCloud configuration is missing on the server.');
  }

  return {
    appID: Number(ZEGO_APP_ID),
    server: ZEGO_SERVER,
  };
}
