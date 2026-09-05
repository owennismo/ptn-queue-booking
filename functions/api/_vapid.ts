import { buildPushPayload, PushSubscription, VapidKeys } from '@block65/webcrypto-web-push';

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

export async function sendWebPushNotification(
  subscription: WebPushSubscription,
  payload: WebPushPayload
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return { success: false, error: 'Invalid subscription object' };
    }

    const pushSub: PushSubscription = {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime ?? null,
      keys: {
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
      },
    };

    const vapid: VapidKeys = {
      subject: VAPID_SUBJECT,
      publicKey: VAPID_PUBLIC_KEY,
      privateKey: VAPID_PRIVATE_KEY,
    };

    const message = {
      data: JSON.stringify({
        title: payload.title || 'PTN Pharma Center แจ้งเตือนคิวส่งของ',
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/favicon.png',
        tag: payload.tag || payload.booking_id || 'ptn-queue-update',
        data: {
          url: payload.url || (payload.booking_id ? `/booking/${payload.booking_id}` : '/'),
          booking_id: payload.booking_id,
        },
      }),
      options: {
        ttl: 86400, // 24 hours
        urgency: 'high' as const,
      },
    };

    const pushPayload = await buildPushPayload(message, pushSub, vapid);

    const res = await fetch(subscription.endpoint, {
      method: pushPayload.method,
      headers: pushPayload.headers,
      body: pushPayload.body,
    });

    if (res.status === 201 || res.status === 200 || res.status === 202) {
      return { success: true, status: res.status };
    }

    // 404 or 410 indicates subscription has expired or unsubscribed
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
