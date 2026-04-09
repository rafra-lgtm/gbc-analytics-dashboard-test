import { OrdersChart } from '@/components/orders-chart';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { formatCurrency, resolveDashboardCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type OrderRow = {
  retailcrm_id: string;
  order_number: string | null;
  customer_name: string | null;
  status: string | null;
  total_sum: number;
  currency: string;
  created_at_retailcrm: string | null;
};

function dayKey(value: string | null) {
  if (!value) return 'Unknown';
  return new Date(value).toISOString().slice(0, 10);
}

export default async function HomePage() {
  let orders: OrderRow[] = [];
  let errorMessage: string | null = null;

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('orders')
      .select('retailcrm_id, order_number, customer_name, status, total_sum, currency, created_at_retailcrm')
      .order('created_at_retailcrm', { ascending: false })
      .limit(200);

    if (error) throw error;
    orders = (data ?? []) as OrderRow[];
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
  }

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_sum ?? 0), 0);
  const avgCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const displayCurrency = resolveDashboardCurrency(orders.map((order) => order.currency), 'KZT');

  const byDay = orders.reduce<Record<string, { date: string; orders: number; totalSum: number }>>((acc, order) => {
    const date = dayKey(order.created_at_retailcrm);
    if (!acc[date]) acc[date] = { date, orders: 0, totalSum: 0 };
    acc[date].orders += 1;
    acc[date].totalSum += Number(order.total_sum ?? 0);
    return acc;
  }, {});

  const chartData = Object.values(byDay)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  const latestOrders = orders.slice(0, 10);

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <h1 style={{ margin: '0 0 20px', fontSize: 28 }}>Мини-дашборд заказов</h1>

      {errorMessage && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          Не удалось загрузить данные из Supabase: {errorMessage}
        </div>
      )}

      <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 16 }}>
        <Card title="Всего заказов" value={String(totalOrders)} />
        <Card title="Общая сумма" value={formatCurrency(totalRevenue, displayCurrency)} />
        <Card title="Средний чек" value={formatCurrency(avgCheck, displayCurrency)} />
      </section>

      <section style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb', marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Заказы по дням</h2>
        {chartData.length > 0 ? <OrdersChart data={chartData} currency={displayCurrency} /> : <EmptyState text="Пока нет данных для графика" />}
      </section>

      <section style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Последние заказы</h2>
        {latestOrders.length === 0 ? (
          <EmptyState text="Заказы ещё не синхронизированы" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '10px 8px' }}>ID</th>
                  <th style={{ padding: '10px 8px' }}>Клиент</th>
                  <th style={{ padding: '10px 8px' }}>Статус</th>
                  <th style={{ padding: '10px 8px' }}>Сумма</th>
                  <th style={{ padding: '10px 8px' }}>Дата</th>
                </tr>
              </thead>
              <tbody>
                {latestOrders.map((order) => (
                  <tr key={order.retailcrm_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 8px' }}>{order.order_number ?? order.retailcrm_id}</td>
                    <td style={{ padding: '10px 8px' }}>{order.customer_name ?? '—'}</td>
                    <td style={{ padding: '10px 8px' }}>{order.status ?? '—'}</td>
                    <td style={{ padding: '10px 8px' }}>{formatCurrency(order.total_sum, displayCurrency)}</td>
                    <td style={{ padding: '10px 8px' }}>
                      {order.created_at_retailcrm ? new Date(order.created_at_retailcrm).toLocaleString('ru-RU') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb' }}>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p style={{ color: '#64748b', margin: 0 }}>{text}</p>;
}
