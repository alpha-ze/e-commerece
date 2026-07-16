import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { getDashboard, type DashboardData } from '../../api/admin';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return `AED ${value.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center gap-4">
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-2">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-indigo-600">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

// ── Loading / Error ───────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-24">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  const chartData = (data?.daily_revenue ?? []).map((d) => ({
    date: formatDate(d.date),
    revenue: Number(d.revenue),
  }));

  const maxRevenue = chartData.reduce((m, d) => Math.max(m, d.revenue), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

        {loading && <LoadingSpinner />}

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatCard
                label="Total Orders"
                value={data.total_orders.toLocaleString()}
                color="bg-indigo-50"
                icon={
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
              />
              <StatCard
                label="Total Customers"
                value={data.total_customers.toLocaleString()}
                color="bg-green-50"
                icon={
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />
              <StatCard
                label="Total Revenue"
                value={formatCurrency(Number(data.total_revenue))}
                color="bg-yellow-50"
                icon={
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-3 mb-8">
              <Link
                to="/admin/products"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Product
              </Link>
              <Link
                to="/admin/shipping"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500 text-sm font-semibold text-white hover:bg-yellow-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                </svg>
                Shipping
              </Link>
              <Link
                to="/admin/orders"
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                All Orders
              </Link>
            </div>

            {/* Revenue chart */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Daily Revenue</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Last 30 days</p>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setChartType('area')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${chartType === 'area' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Area
                  </button>
                  <button
                    onClick={() => setChartType('bar')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${chartType === 'bar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Bar
                  </button>
                </div>
              </div>

              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <svg className="w-12 h-12 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-sm text-gray-400">No revenue data yet.</p>
                  <p className="text-xs text-gray-300 mt-1">Revenue appears once orders are delivered.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  {chartType === 'area' ? (
                    <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => maxRevenue >= 1000 ? `AED ${(v / 1000).toFixed(1)}k` : `AED ${v}`} width={55} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revenueGradient)" dot={false} activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }} />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => maxRevenue >= 1000 ? `AED ${(v / 1000).toFixed(1)}k` : `AED ${v}`} width={55} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


export default AdminDashboardPage;
