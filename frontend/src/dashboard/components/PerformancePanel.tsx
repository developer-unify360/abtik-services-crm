import React from 'react';
import { Briefcase, FileText, IndianRupee, Target, TrendingUp, User } from 'lucide-react';
import ChartContainer from './ChartContainer';

export interface PerformanceActivity {
  id?: string;
  type: string;
  title: string;
  created_at: string;
  status?: string;
  amount?: number;
}

export interface PerformanceData {
  user: { id: string; name: string; role: string };
  leads_created: number;
  leads_converted: number;
  bookings_created: number;
  conversion_rate: number;
  total_payments: number;
  recent_activity: PerformanceActivity[];
  performance_history: Array<{ day: string; leads: number; bookings: number }>;
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-IN');

const formatCurrency = (value: number) => currencyFormatter.format(value || 0);
const formatNumber = (value: number) => numberFormatter.format(value || 0);
const formatRole = (role: string) => role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const PerformancePanel: React.FC<{ data: PerformanceData }> = ({ data }) => {
  const isBDE = data.user.role === 'bde';
  const chartLabels = data.performance_history.map((entry) => entry.day);
  const chartData = isBDE
    ? data.performance_history.map((entry) => entry.leads)
    : data.performance_history.map((entry) => entry.bookings);

  const metrics = isBDE
    ? [
        { label: 'Leads Created', value: formatNumber(data.leads_created), icon: <FileText size={16} /> },
        { label: 'Won Leads', value: formatNumber(data.leads_converted), icon: <Target size={16} /> },
        { label: 'Bookings Linked', value: formatNumber(data.bookings_created), icon: <Briefcase size={16} /> },
        { label: 'Conversion Rate', value: `${data.conversion_rate}%`, icon: <TrendingUp size={16} /> },
      ]
    : [
        { label: 'Revenue Collected', value: formatCurrency(data.total_payments), icon: <IndianRupee size={16} /> },
        { label: 'Bookings', value: formatNumber(data.bookings_created), icon: <Briefcase size={16} /> },
        { label: 'Lead Conversions', value: formatNumber(data.leads_converted), icon: <Target size={16} /> },
        { label: 'Conversion Rate', value: `${data.conversion_rate}%`, icon: <TrendingUp size={16} /> },
      ];

  return (
    <section className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <User size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">{data.user.name}</h2>
              <p className="text-sm text-slate-500">{formatRole(data.user.role)}</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-medium text-slate-500">Selected user performance</p>
            <p className="text-sm font-semibold text-slate-900">
              {isBDE ? `${formatNumber(data.leads_created)} leads created` : formatCurrency(data.total_payments)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="card p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              {metric.icon}
            </div>
            <p className="text-xs font-medium text-slate-500">{metric.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <ChartContainer
          title={isBDE ? 'Lead trend' : 'Booking trend'}
          data={chartData}
          labels={chartLabels}
          unit={isBDE ? 'Last 7 days of leads' : 'Last 7 days of bookings'}
          color={isBDE ? 'bg-indigo-500' : 'bg-emerald-500'}
          valueFormatter={(value) => formatNumber(value)}
        />

        <div className="card p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Recent activity</h3>
            <p className="text-xs text-slate-500">Latest items linked to this user.</p>
          </div>

          {data.recent_activity.length > 0 ? (
            <div className="space-y-3">
              {data.recent_activity.map((activity, index) => (
                <div
                  key={activity.id || `${activity.type}-${index}`}
                  className="rounded-lg border border-slate-100 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{activity.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {typeof activity.amount === 'number' ? (
                        <p className="text-sm font-semibold text-emerald-600">{formatCurrency(activity.amount)}</p>
                      ) : (
                        <p className="text-xs font-medium text-slate-600">{activity.status || activity.type}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              No recent activity found.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PerformancePanel;
