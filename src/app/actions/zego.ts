'use server';

/**
 * @fileOverview Server actions for ZegoCloud integration.
 */

const ZEGO_APP_ID = "YOUR_ZEGO_APP_ID";
const ZEGO_SERVER_SECRET = "YOUR_ZEGO_SERVER_SECRET";

export async function getZegoConfig() {
  if (!ZEGO_APP_ID || ZEGO_APP_ID === "YOUR_ZEGO_APP_ID") {
    throw new Error('ZegoCloud AppID is missing.');
  }

  return {
    appID: Number(ZEGO_APP_ID),
    serverSecret: ZEGO_SERVER_SECRET
  };
}

export async function getZegoAppId() {
  return Number(ZEGO_APP_ID);
}
