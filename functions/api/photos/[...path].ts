import { DataStore } from '../_store';

export async function onRequestGet(context: { request: Request; env: any; params: any }) {
  try {
    const { params, env } = context;
    const pathParam = params.path;

    const rawPath = Array.isArray(pathParam) ? pathParam.join('/') : pathParam;
    if (!rawPath) {
      return new Response('Photo path is required', { status: 400 });
    }

    // Ensure key matches format (photos/YYYY-MM/...)
    const key = rawPath.startsWith('photos/') ? rawPath : `photos/${rawPath}`;

    const store = new DataStore(env);
    const photo = await store.getPhoto(key);

    if (!photo) {
      return new Response('Photo not found or expired', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', photo.mimeType || 'image/webp');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    if (photo.etag) {
      headers.set('ETag', photo.etag);
    }

    return new Response(photo.buffer, { headers });
  } catch (err: any) {
    console.error('Serve photo error:', err);
    return new Response('Error retrieving photo', { status: 500 });
  }
}
