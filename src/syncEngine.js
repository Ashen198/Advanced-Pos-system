// src/syncEngine.js
import { db } from './db';

// Helper function to check real internet connectivity by pinging an online service
export async function checkRealOnlineStatus() {
  if (!navigator.onLine) return false;

  try {
    // Ping an online service with a 3-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch('https://httpbin.org/get', {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false; // Connection failed or timed out
  }
}

export async function processOfflineQueue() {
  const isOnline = await checkRealOnlineStatus();
  if (!isOnline) return;

  const pendingSales = await db.salesQueue.where('status').equals('pending').toArray();
  if (pendingSales.length === 0) return;

  for (const sale of pendingSales) {
    try {
      const response = await fetch('https://httpbin.org/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale),
      });

      if (response.ok) {
        await db.salesQueue.update(sale.id, { status: 'synced' });
        console.log(`Sale #${sale.id} synced successfully.`);
      }
    } catch (error) {
      console.error(`Sync failed for sale #${sale.id}:`, error);
    }
  }
}

// Re-check sync automatically when browser detects network reconnection
window.addEventListener('online', processOfflineQueue);