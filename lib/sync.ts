import { fetchRetailOrders } from './retailcrm';
import { getSupabaseAdminClient } from './supabase';
import { buildLargeOrderMessage, isLargeOrder, sendTelegramMessage } from './telegram';
import { NormalizedOrder, SyncStats } from './types';
import { normalizeRetailOrder } from './utils';

export async function syncRetailOrdersToSupabase(sendAlerts = false) {
  const supabase = getSupabaseAdminClient();
  const stats: SyncStats = { fetched: 0, inserted: 0, updated: 0, failed: 0, alerted: 0 };
  const alertedOrderIds = new Set<string>();

  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const batch = await fetchRetailOrders(page, 100);
    const normalizedOrders = batch.orders.map(normalizeRetailOrder);
    stats.fetched += normalizedOrders.length;

    if (normalizedOrders.length > 0) {
      const orderIds = normalizedOrders.map((order) => order.retailcrm_id);
      const { data: existingRows, error: existingError } = await supabase
        .from('orders')
        .select('retailcrm_id')
        .in('retailcrm_id', orderIds);

      if (existingError) {
        throw new Error(`Supabase read failed: ${existingError.message}`);
      }

      const existingSet = new Set((existingRows ?? []).map((row) => row.retailcrm_id));
      stats.updated += normalizedOrders.filter((order) => existingSet.has(order.retailcrm_id)).length;
      stats.inserted += normalizedOrders.filter((order) => !existingSet.has(order.retailcrm_id)).length;

      const { error: upsertError } = await supabase.from('orders').upsert(normalizedOrders, {
        onConflict: 'retailcrm_id'
      });

      if (upsertError) {
        stats.failed += normalizedOrders.length;
      } else if (sendAlerts) {
        await notifyLargeOrders(normalizedOrders, alertedOrderIds);
        stats.alerted += normalizedOrders.filter((order) => alertedOrderIds.has(order.retailcrm_id)).length;
      }
    }

    hasNext = batch.hasNext;
    page += 1;
  }

  return stats;
}

async function notifyLargeOrders(orders: NormalizedOrder[], alertedOrderIds: Set<string>) {
  for (const order of orders) {
    if (!isLargeOrder(order) || alertedOrderIds.has(order.retailcrm_id)) {
      continue;
    }

    try {
      await sendTelegramMessage(buildLargeOrderMessage(order));
      alertedOrderIds.add(order.retailcrm_id);
    } catch (error) {
      console.error(`Telegram alert failed for ${order.retailcrm_id}:`, error);
    }
  }
}
