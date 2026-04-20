'use server';

import crypto from 'crypto';

/**
 * @fileOverview Server action to generate Tencent Cloud TRTC UserSig.
 */

const SDKAPPID = 0; // REPLACE WITH YOUR TENCENT SDK APP ID (NUMBER)
const SECRETKEY = "YOUR_TENCENT_SECRET_KEY";

export async function getTencentUserSig(userId: string) {
  if (!SDKAPPID || !SECRETKEY || SECRETKEY === "YOUR_TENCENT_SECRET_KEY") {
    throw new Error('Tencent Cloud configuration is missing on the server.');
  }

  const EXPIRE_TIME = 86400;
  const currTime = Math.floor(Date.now() / 1000);
  
  const base64url = (str: string) => {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const version = 2;
  const hmac = crypto.createHmac('sha256', SECRETKEY);
  hmac.update(`TLS.identifier:${userId}\nTLS.sdkappid:${SDKAPPID}\nTLS.expire:${EXPIRE_TIME}\nTLS.time:${currTime}\n`);
  const signature = hmac.digest('base64');

  const finalSigObj = {
    'TLS.ver': '2.0',
    'TLS.identifier': userId,
    'TLS.sdkappid': SDKAPPID,
    'TLS.expire': EXPIRE_TIME,
    'TLS.time': currTime,
    'TLS.sig': signature,
  };

  const finalSig = Buffer.from(JSON.stringify(finalSigObj)).toString('base64');
  
  return {
    userSig: base64url(finalSig),
    sdkAppId: SDKAPPID,
  };
}
