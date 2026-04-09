export type RetailCrmPhone = {
  number?: string;
};

export type RetailCrmCustomer = {
  firstName?: string;
  lastName?: string;
  phones?: RetailCrmPhone[];
};

export type RetailCrmOrder = {
  id?: number | string;
  externalId?: string | number;
  number?: string;
  status?: string;
  totalSumm?: number | string;
  summ?: number | string;
  total?: number | string;
  currency?: string;
  createdAt?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  customer?: RetailCrmCustomer;
  [key: string]: unknown;
};

export type NormalizedOrder = {
  retailcrm_id: string;
  external_id: string | null;
  order_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  status: string | null;
  total_sum: number;
  currency: string;
  created_at_retailcrm: string | null;
  raw: RetailCrmOrder;
};

export type SyncStats = {
  fetched: number;
  inserted: number;
  updated: number;
  failed: number;
  alerted: number;
};
