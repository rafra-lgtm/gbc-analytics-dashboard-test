import { NormalizedOrder } from './types';

export function getAlertThreshold() {
  return Number(process.env.ALERT_THRESHOLD ?? 50000);
}

export function isLargeOrder(order: Pick<NormalizedOrder, 'total_sum'>) {
  return order.total_sum > getAlertThreshold();
}

export function buildLargeOrderMessage(order: NormalizedOrder) {
  return [
    '🚨 Новый крупный заказ',
    `ID: ${order.retailcrm_id}`,
    `Клиент: ${order.customer_name ?? 'Не указан'}`,
    `Сумма: ${order.total_sum.toLocaleString('ru-RU')} ₸`,
    `Статус: ${order.status ?? 'Не указан'}`
  ].join('\n');
}

export async function sendTelegramMessage(text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required');
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });

  const data = (await response.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!response.ok || !data.ok) {
    throw new Error(`Telegram send failed: ${data.description ?? 'unknown error'}`);
  }

  return data;
}
