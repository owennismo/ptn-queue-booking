// Zero-dependency Native Web Crypto Web Push Implementation (RFC 8291 & RFC 8292)
// Built specifically for Cloudflare Pages Functions & Workers without external npm dependencies.

export const VAPID_PUBLIC_KEY = 'BIc7yNsFjMwfbNll7_G8NBWo7gI4jXVNr-TCjs5DHbtjcK45nV5RdElCnZsOHyf2tPjghbPLpER-96rXogG7SZ4';
export const VAPID_PRIVATE_KEY = 'TO-vfbwHCZXDYL_vp8I2SYfFFEi62w7XNaWinVHkNdQ';
export const VAPID_SUBJECT = 'https://ptn-queue-booking.pages.dev';

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  booking_id?: string;
}

export interface WebPushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    auth: string;
    p256dh: string;
  };
}

// ---------------------------------------------------------------------------
// Base64 / Base64URL Helpers using Web Crypto & standard APIs
// ---------------------------------------------------------------------------
function base64UrlToUint8Array(base64UrlStr: string): Uint8Array {
  let base64 = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function stringToUint8Array(str: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(str);
  const buf = new Uint8Array(encoded.length);
  buf.set(encoded);
  return buf;
}

function objectToBase64Url(obj: any): string {
  return uint8ArrayToBase64Url(stringToUint8Array(JSON.stringify(obj)));
}

// ---------------------------------------------------------------------------
// VAPID JWT Signing (RFC 8292)
// ---------------------------------------------------------------------------
async function generateVapidHeader(endpoint: string, subject: string, publicKey: string, privateKey: string) {
  const parsedEndpoint = new URL(endpoint);
  const audience = parsedEndpoint.origin;

  const header = { alg: 'ES256', typ: 'JWT' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const headerB64 = objectToBase64Url(header);
  const payloadB64 = objectToBase64Url(payload);
  const dataToSign = `${headerB64}.${payloadB64}`;

  const pubBytes = base64UrlToUint8Array(publicKey);
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: uint8ArrayToBase64Url(pubBytes.slice(1, 33)),
      y: uint8ArrayToBase64Url(pubBytes.slice(33, 65)),
      d: privateKey,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    stringToUint8Array(dataToSign)
  );

  const token = `${dataToSign}.${uint8ArrayToBase64Url(new Uint8Array(signature))}`;
  return `vapid t=${token}, k=${publicKey}`;
}

// ---------------------------------------------------------------------------
// HKDF Implementation (RFC 5869)
// ---------------------------------------------------------------------------
async function hmacSha256(keyData: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, message);
  return new Uint8Array(sig);
}

async function hkdfExtractAndExpand(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  // Extract
  const prk = await hmacSha256(salt, ikm);
  // Expand
  const blocks: Uint8Array[] = [];
  let prev = new Uint8Array(0);
  const numBlocks = Math.ceil(length / 32);

  for (let i = 1; i <= numBlocks; i++) {
    const data = new Uint8Array(prev.length + info.length + 1);
    data.set(prev, 0);
    data.set(info, prev.length);
    data[data.length - 1] = i;
    prev = await hmacSha256(prk, data);
    blocks.push(prev);
  }

  const result = new Uint8Array(blocks.reduce((sum, b) => sum + b.length, 0));
  let offset = 0;
  for (const b of blocks) {
    result.set(b, offset);
    offset += b.length;
  }
  return result.slice(0, length);
}

// ---------------------------------------------------------------------------
// RFC 8291 / RFC 8188 Web Push Payload Encryption (aes128gcm)
// ---------------------------------------------------------------------------
async function encryptPayload(subscription: WebPushSubscription, plaintext: Uint8Array): Promise<Uint8Array> {
  const clientPublicBytes = base64UrlToUint8Array(subscription.keys.p256dh);
  const authSecretBytes = base64UrlToUint8Array(subscription.keys.auth);

  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Local ephemeral ECDH keypair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicBytes = new Uint8Array(localPublicKeyRaw);

  // Shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Info structures
  const keyInfo = new Uint8Array([
    ...stringToUint8Array('WebPush: info\0'),
    ...clientPublicBytes,
    ...localPublicBytes,
  ]);
  const cekInfo = stringToUint8Array('Content-Encoding: aes128gcm\0');
  const nonceInfo = stringToUint8Array('Content-Encoding: nonce\0');

  // IKM
  const ikm = await hkdfExtractAndExpand(authSecretBytes, sharedSecret, keyInfo, 32);

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive CEK and Nonce
  const cek = await hkdfExtractAndExpand(salt, ikm, cekInfo, 16);
  const nonce = await hkdfExtractAndExpand(salt, ikm, nonceInfo, 12);

  const cekKey = await crypto.subtle.importKey(
    'raw',
    cek,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt']
  );

  // Padding delimiter (0x02 indicates the final record)
  const padded = new Uint8Array(plaintext.length + 1);
  padded.set(plaintext, 0);
  padded[plaintext.length] = 0x02;

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    cekKey,
    padded
  );

  // Record size = 4096 (4 bytes big-endian)
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);

  // RFC 8188 §2.1 Header: salt (16) + record_size (4) + key_id_len (1) + key_id (65) + encrypted payload
  const result = new Uint8Array(16 + 4 + 1 + localPublicBytes.length + encrypted.byteLength);
  let pos = 0;
  result.set(salt, pos); pos += 16;
  result.set(recordSize, pos); pos += 4;
  result[pos] = localPublicBytes.length; pos += 1;
  result.set(localPublicBytes, pos); pos += localPublicBytes.length;
  result.set(new Uint8Array(encrypted), pos);

  return result;
}

// ---------------------------------------------------------------------------
// Send Push Notification
// ---------------------------------------------------------------------------
export async function sendWebPushNotification(
  subscription: WebPushSubscription,
  payload: WebPushPayload
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return { success: false, error: 'Invalid subscription object' };
    }

    const messageJson = JSON.stringify({
      title: payload.title || 'PTN Pharma Center แจ้งเตือนคิวส่งของ',
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/favicon.png',
      tag: payload.tag || payload.booking_id || 'ptn-queue-update',
      data: {
        url: payload.url || (payload.booking_id ? `/booking/${payload.booking_id}` : '/'),
        booking_id: payload.booking_id,
      },
    });

    const plaintext = stringToUint8Array(messageJson);
    const body = await encryptPayload(subscription, plaintext);
    const vapidAuth = await generateVapidHeader(
      subscription.endpoint,
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const res = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': vapidAuth,
        'TTL': '86400',
        'Urgency': 'high',
        'Content-Encoding': 'aes128gcm',
        'Content-Length': body.byteLength.toString(),
        'Content-Type': 'application/octet-stream',
      },
      body,
    });

    if (res.status === 201 || res.status === 200 || res.status === 202) {
      return { success: true, status: res.status };
    }

    const errText = await res.text().catch(() => '');
    return {
      success: false,
      status: res.status,
      error: `Push service responded with HTTP ${res.status}: ${errText}`,
    };
  } catch (err: any) {
    console.error('Error sending Web Push notification:', err);
    return { success: false, error: err.message || 'Unknown Web Push error' };
  }
}
