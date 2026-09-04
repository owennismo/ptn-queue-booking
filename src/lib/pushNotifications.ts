/**
 * Web Push and Browser Notification Utility for PTN Queue Booking System
 */

export interface QueueNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  booking_id?: string;
}

// Play a pleasant chime sound when notification fires
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Pleasant two-tone chime (E5 -> G#5 -> B5)
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    playTone(659.25, 0, 0.25);    // E5
    playTone(830.61, 0.12, 0.35);  // G#5
    playTone(987.77, 0.24, 0.45);  // B5
  } catch (e) {
    console.warn('AudioContext error:', e);
  }
}

// Check if browser supports notifications
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

// Check current permission state
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

// Request notification permission from user
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Register service worker if not already registered
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js');
        } catch (e) {
          console.warn('SW register error:', e);
        }
      }
    }
    return permission;
  } catch (err) {
    console.error('Request notification permission error:', err);
    return 'denied';
  }
}

// Trigger a Web / Mobile Push Notification
export async function sendQueueNotification(payload: QueueNotificationPayload) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  // Play audio chime
  playNotificationSound();

  // Vibrate mobile device if supported (Pattern: vibrate 200ms, pause 100ms, vibrate 200ms)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch (e) {}
  }

  const title = payload.title || 'PTN Pharma Center แจ้งเตือนคิวส่งของ';
  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/favicon.png',
    tag: payload.tag || payload.booking_id || 'ptn-queue-alert',
    data: {
      url: payload.url || (payload.booking_id ? `/booking/${payload.booking_id}` : '/'),
    },
  };

  // 1. Try sending via ServiceWorker Registration (Best for Mobile Chrome & Background tabs)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return true;
      }
    } catch (e) {
      console.warn('ServiceWorker showNotification fallback:', e);
    }
  }

  // 2. Fallback to Window Notification API
  try {
    const notif = new Notification(title, options);
    notif.onclick = function (event) {
      event.preventDefault();
      window.focus();
      if (payload.url) {
        window.location.href = payload.url;
      }
      notif.close();
    };
    return true;
  } catch (err) {
    console.error('Window Notification error:', err);
    return false;
  }
}
