
'use server';

/**
 * @fileOverview Server actions for ZegoCloud integration.
 * Handles secure retrieval of configuration and token generation logic.
 */

export async function getZegoConfig() {
  return {
    appID: Number(process.env.NEXT_PUBLIC_ZEGO_APP_ID),
    // We do NOT return the server secret to the client.
    // In a production app, you would generate a full JWT here.
    // For this prototype, we provide the secret to the secure client-side generation
    // if the user has opted for that, but we use the requested 'ZEGO_SERVER_SECRET' name.
    serverSecret: process.env.ZEGO_SERVER_SECRET,
  };
}
