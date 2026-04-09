'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/utils';

export type DailyMetric = {
  date: string;
  orders: number;
  totalSum: number;
};

export function OrdersChart({ data, currency }: { data: DailyMetric[]; currency: string }) {
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sumGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(value: number) => formatCurrency(Number(value), currency)} />
          <Tooltip formatter={(value: number) => formatCurrency(Number(value), currency)} />
          <Area type="monotone" dataKey="totalSum" stroke="#2563eb" fillOpacity={1} fill="url(#sumGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
