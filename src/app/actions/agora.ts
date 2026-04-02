
'use server';

/**
 * @fileOverview Server actions for Agora RTC integration.
 * Handles secure token generation for one-on-one calls.
 */

import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

const AGORA_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

/**
 * Generates an RTC token for a specific channel and user.
 * @param channelName The Firebase chatId used as the room name.
 * @param uid The numeric or string ID of the user.
 */
export async function getAgoraToken(channelName: string, uid: string) {
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    throw new Error('Agora configuration is missing on the server.');
  }

  // Token expires in 1 hour
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  // We use string UIDs because Firebase UIDs are alphanumeric
  const token = RtcTokenBuilder.buildTokenWithAccount(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    privilegeExpiredTs
  );

  return {
    token,
    appId: AGORA_APP_ID,
  };
}
