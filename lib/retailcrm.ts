import { RetailCrmOrder } from './types';

const DEFAULT_API_PREFIX = '/api/v5';

function getRetailCrmConfig() {
  const baseUrl = process.env.RETAILCRM_BASE_URL;
  const apiKey = process.env.RETAILCRM_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('RETAILCRM_BASE_URL and RETAILCRM_API_KEY are required');
  }

  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey };
}

function buildUrl(path: string, params: Record<string, string | number> = {}) {
  const { baseUrl, apiKey } = getRetailCrmConfig();
  const url = new URL(`${baseUrl}${DEFAULT_API_PREFIX}${path}`);
  url.searchParams.set('apiKey', apiKey);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  return url;
}

export async function createRetailOrder(order: Record<string, unknown>) {
  const url = buildUrl('/orders/create');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order })
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok || data.success === false) {
    throw new Error(`RetailCRM create failed: ${JSON.stringify(data)}`);
  }

  return data;
}

export async function fetchRetailOrders(page = 1, limit = 100): Promise<{ orders: RetailCrmOrder[]; hasNext: boolean }> {
  const url = buildUrl('/orders', { page, limit });
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });

  const data = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    orders?: RetailCrmOrder[];
    pagination?: { currentPage?: number; totalPageCount?: number };
  };

  if (!response.ok || data.success === false) {
    throw new Error(`RetailCRM fetch failed on page ${page}`);
  }

  const orders = Array.isArray(data.orders) ? data.orders : [];
  const totalPageCount = data.pagination?.totalPageCount ?? page;
  const hasNext = page < totalPageCount;

  return { orders, hasNext };
}
