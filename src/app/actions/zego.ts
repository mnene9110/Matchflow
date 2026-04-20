'use server';

/**
 * @fileOverview Server actions for ZegoCloud integration.
 */

const ZEGO_APP_ID = process.env.ZEGO_APP_ID;
const ZEGO_SERVER_SECRET = process.env.ZEGO_SERVER_SECRET;

export async function getZegoConfig() {
  if (!ZEGO_APP_ID || !ZEGO_SERVER_SECRET) {
    throw new Error('ZegoCloud configuration is missing on the server.');
  }

  return {
    appID: Number(ZEGO_APP_ID),
    serverSecret: ZEGO_SERVER_SECRET
  };
}

export async function getZegoAppId() {
  if (!ZEGO_APP_ID) {
    throw new Error('ZegoCloud AppID is missing.');
  }
  return Number(ZEGO_APP_ID);
}
