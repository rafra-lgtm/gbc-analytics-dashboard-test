import { NormalizedOrder, RetailCrmOrder } from './types';

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = Number(value.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(normalized) ? normalized : fallback;
  }
  return fallback;
}

export function buildCustomerName(order: RetailCrmOrder): string | null {
  const firstName = order.customer?.firstName ?? order.firstName;
  const lastName = order.customer?.lastName ?? order.lastName;
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName.length > 0 ? fullName : null;
}

export function extractPhone(order: RetailCrmOrder): string | null {
  const customerPhone = order.customer?.phones?.find((p) => p.number)?.number;
  const fallbackPhone = typeof order.phone === 'string' ? order.phone : null;
  return customerPhone ?? fallbackPhone;
}

export function normalizeRetailOrder(order: RetailCrmOrder): NormalizedOrder {
  const id = String(order.id ?? order.externalId ?? crypto.randomUUID());
  const total = toNumber(order.totalSumm ?? order.summ ?? order.total, 0);

  return {
    retailcrm_id: id,
    external_id: order.externalId ? String(order.externalId) : null,
    order_number: order.number ? String(order.number) : null,
    customer_name: buildCustomerName(order),
    customer_phone: extractPhone(order),
    status: typeof order.status === 'string' ? order.status : null,
    total_sum: total,
    currency: typeof order.currency === 'string' && order.currency.trim() ? order.currency : 'KZT',
    created_at_retailcrm: typeof order.createdAt === 'string' ? order.createdAt : null,
    raw: order
  };
}

export function resolveDashboardCurrency(currencies: Array<string | null | undefined>, fallback = 'KZT'): string {
  const unique = Array.from(new Set(currencies.map((currency) => currency?.trim()).filter(Boolean)));
  return unique.length === 1 ? unique[0]! : fallback;
}

export function formatCurrency(value: number, currency = 'KZT'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value);
}
