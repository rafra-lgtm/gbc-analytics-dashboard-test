import { RetailCrmOrder } from './types';

const RETAIL_API_VERSIONS = ['v5', 'v4'] as const;
const DEFAULT_CREATE_ENDPOINT = '/orders/create';

const RETAILCRM_CREATE_ENDPOINT = process.env.RETAILCRM_CREATE_ENDPOINT || DEFAULT_CREATE_ENDPOINT;
const RETAILCRM_ORDER_CURRENCY = process.env.RETAILCRM_ORDER_CURRENCY || 'KZT';

type RetailVersion = (typeof RETAIL_API_VERSIONS)[number];

type FetchOrdersResult = {
  orders: RetailCrmOrder[];
  hasNext: boolean;
  endpoint: string;
  page: number;
};

type RetailCrmApiErrorDetails = {
  context: 'fetchOrders' | 'createOrder';
  endpoint: string;
  status?: number;
  statusText?: string;
  message?: string;
  responseText?: string;
  page?: number;
  limit?: number;
};

export type RetailCrmCreateOrderResult = {
  success: boolean;
  id?: number | string;
  number?: number | string;
  site?: string;
  order?: Record<string, unknown>;
  raw: Record<string, unknown>;
};

export class RetailCrmApiError extends Error {
  details: RetailCrmApiErrorDetails;

  constructor(message: string, details: RetailCrmApiErrorDetails) {
    super(message);
    this.name = 'RetailCrmApiError';
    this.details = details;
  }
}

function getRetailCrmConfig() {
  const baseUrl = process.env.RETAILCRM_BASE_URL;
  const apiKey = process.env.RETAILCRM_API_KEY;
  const site = process.env.RETAILCRM_SITE || 'main';

  if (!baseUrl || !apiKey) {
    throw new Error('RETAILCRM_BASE_URL and RETAILCRM_API_KEY are required');
  }

  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey, site };
}

function buildRetailUrl(
  path: string,
  version: RetailVersion,
  params: Record<string, string | number> = {},
  includeApiKey = true
) {
  const { baseUrl, apiKey } = getRetailCrmConfig();
  const url = new URL(`${baseUrl}/api/${version}${path}`);

  if (includeApiKey) {
    url.searchParams.set('apiKey', apiKey);
  }
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  return url;
}

function redactApiKey(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.searchParams.has('apiKey')) {
    url.searchParams.set('apiKey', '***');
  }
  return url.toString();
}

async function readApiResponse(response: Response) {
  const responseText = await response.text();
  let json: Record<string, unknown> | undefined;

  if (responseText) {
    try {
      json = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      // non-JSON response from upstream
    }
  }

  return { responseText, json };
}

function upstreamMessage(data?: Record<string, unknown>) {
  const message = data?.message;
  const error = data?.error;

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return undefined;
}

function normalizeHasNext(pagination: Record<string, unknown> | undefined, page: number, ordersLength: number, limit: number) {
  if (!pagination) {
    return ordersLength >= limit;
  }

  const totalPageCount = typeof pagination.totalPageCount === 'number' ? pagination.totalPageCount : undefined;
  if (typeof totalPageCount === 'number') {
    return page < totalPageCount;
  }

  const currentPage = typeof pagination.currentPage === 'number' ? pagination.currentPage : page;
  const totalCount = typeof pagination.totalCount === 'number' ? pagination.totalCount : undefined;

  if (typeof totalCount === 'number') {
    return currentPage * limit < totalCount;
  }

  return ordersLength >= limit;
}

function toErrorMessage(details: RetailCrmApiErrorDetails) {
  return [
    `RetailCRM ${details.context} failed`,
    details.page ? `page=${details.page}` : undefined,
    details.limit ? `limit=${details.limit}` : undefined,
    details.status ? `status=${details.status}` : undefined,
    details.statusText ? `statusText=${details.statusText}` : undefined,
    details.message ? `message=${details.message}` : undefined,
    details.responseText ? `responseText=${details.responseText}` : undefined,
    details.endpoint ? `endpoint=${details.endpoint}` : undefined
  ]
    .filter(Boolean)
    .join('; ');
}

export async function createRetailOrder(order: Record<string, unknown>) {
  const errors: RetailCrmApiError[] = [];
  const { apiKey, site } = getRetailCrmConfig();
  const retailCrmOrderType = process.env.RETAILCRM_ORDER_TYPE;

  const payloadOrder: Record<string, unknown> = { ...order };
  delete payloadOrder.orderType;
  if (retailCrmOrderType) {
    payloadOrder.orderType = retailCrmOrderType;
  }
  if (typeof payloadOrder.currency !== 'string' || !payloadOrder.currency.trim()) {
    payloadOrder.currency = RETAILCRM_ORDER_CURRENCY;
  }

  for (const version of RETAIL_API_VERSIONS) {
    const url = buildRetailUrl(RETAILCRM_CREATE_ENDPOINT, version, {}, false);
    const sanitizedEndpoint = redactApiKey(url.toString());

    const body = new URLSearchParams();
    body.set('apiKey', apiKey);
    body.set('site', site);
    body.set('order', JSON.stringify(payloadOrder));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body
      });

      const { responseText, json } = await readApiResponse(response);
      const message = upstreamMessage(json);
      const success = json?.success;

      if (!response.ok || success === false) {
        const details: RetailCrmApiErrorDetails = {
          context: 'createOrder',
          endpoint: sanitizedEndpoint,
          status: response.status,
          statusText: response.statusText,
          message,
          responseText
        };

        if (response.status >= 400) {
          console.error('RetailCRM createOrder error response', {
            status: response.status,
            statusText: response.statusText,
            responseText,
            endpoint: sanitizedEndpoint
          });
        }

        errors.push(new RetailCrmApiError(toErrorMessage(details), details));
        continue;
      }

      const normalizedJson = (json ?? {}) as Record<string, unknown>;
      const responseOrder =
        normalizedJson.order && typeof normalizedJson.order === 'object'
          ? (normalizedJson.order as Record<string, unknown>)
          : undefined;
      const id = normalizedJson.id ?? responseOrder?.id;
      const number = normalizedJson.number ?? responseOrder?.number;
      const responseSite = normalizedJson.site ?? responseOrder?.site;

      return {
        success: true,
        id: typeof id === 'string' || typeof id === 'number' ? id : undefined,
        number: typeof number === 'string' || typeof number === 'number' ? number : undefined,
        site: typeof responseSite === 'string' ? responseSite : site,
        order: responseOrder,
        raw: normalizedJson
      } satisfies RetailCrmCreateOrderResult;
    } catch (error) {
      const details: RetailCrmApiErrorDetails = {
        context: 'createOrder',
        endpoint: sanitizedEndpoint,
        message: error instanceof Error ? error.message : 'Unknown fetch error'
      };
      errors.push(new RetailCrmApiError(toErrorMessage(details), details));
    }
  }

  const latestError = errors[errors.length - 1];
  throw new RetailCrmApiError(latestError?.message ?? 'RetailCRM create failed', {
    context: 'createOrder',
    endpoint: errors.map((error) => error.details.endpoint).join(', '),
    message: errors.map((error) => error.message).join(' | '),
    responseText: errors.map((error) => error.details.responseText).filter(Boolean).join('\n---\n')
  });
}

export async function fetchRetailOrders(page = 1, limit = 100): Promise<FetchOrdersResult> {
  const errors: RetailCrmApiError[] = [];

  for (const version of RETAIL_API_VERSIONS) {
    const url = buildRetailUrl('/orders', version, { page, limit });
    const sanitizedEndpoint = redactApiKey(url.toString());

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });

      const { responseText, json } = await readApiResponse(response);
      const message = upstreamMessage(json);
      const success = json?.success;

      if (!response.ok || success === false) {
        const details: RetailCrmApiErrorDetails = {
          context: 'fetchOrders',
          endpoint: sanitizedEndpoint,
          status: response.status,
          statusText: response.statusText,
          message,
          responseText,
          page,
          limit
        };

        errors.push(new RetailCrmApiError(toErrorMessage(details), details));
        continue;
      }

      const typedJson = json as {
        orders?: RetailCrmOrder[];
        pagination?: Record<string, unknown>;
      };

      const orders = Array.isArray(typedJson?.orders) ? typedJson.orders : [];
      const hasNext = normalizeHasNext(typedJson?.pagination, page, orders.length, limit);

      return {
        orders,
        hasNext,
        endpoint: sanitizedEndpoint,
        page
      };
    } catch (error) {
      const details: RetailCrmApiErrorDetails = {
        context: 'fetchOrders',
        endpoint: sanitizedEndpoint,
        message: error instanceof Error ? error.message : 'Unknown fetch error',
        page,
        limit
      };

      errors.push(new RetailCrmApiError(toErrorMessage(details), details));
    }
  }

  const latestError = errors[errors.length - 1];
  throw new RetailCrmApiError(latestError?.message ?? `RetailCRM fetch failed on page ${page}`, {
    context: 'fetchOrders',
    endpoint: errors.map((error) => error.details.endpoint).join(', '),
    page,
    limit,
    message: errors.map((error) => error.message).join(' | '),
    responseText: errors.map((error) => error.details.responseText).filter(Boolean).join('\n---\n')
  });
}
