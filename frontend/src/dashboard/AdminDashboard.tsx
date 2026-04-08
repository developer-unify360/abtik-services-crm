import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock3,
  IndianRupee,
  Users,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import PerformancePanel, { type PerformanceData } from './components/PerformancePanel';

interface DashboardSummary {
  total_clients: number;
  total_bookings: number;
  pending_bookings: number;
  completed_bookings: number;
  today_leads: number;
  today_bookings: number;
  total_collections: number;
}

interface ServiceRevenueItem {
  service_id: string;
  name: string;
  revenue: number;
  payments_count: number;
}

interface BDEPerformanceItem {
  user_id: string;
  name: string;
  lead_count: number;
  won_count: number;
}

interface BDMPerformanceItem {
  user_id: string;
  name: string;
  revenue: number;
  bookings_count: number;
  payments_count: number;
}

interface DashboardOverview {
  summary: DashboardSummary;
  service_revenue: ServiceRevenueItem[];
  bde_performance: BDEPerformanceItem[];
  bdm_performance: BDMPerformanceItem[];
}

const emptyOverview: DashboardOverview = {
  summary: {
    total_clients: 0,
    total_bookings: 0,
    pending_bookings: 0,
    completed_bookings: 0,
    today_leads: 0,
    today_bookings: 0,
    total_collections: 0,
  },
  service_revenue: [],
  bde_performance: [],
  bdm_performance: [],
};

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-IN');

const formatCurrency = (value: number) => currencyFormatter.format(value || 0);
const formatNumber = (value: number) => numberFormatter.format(value || 0);

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedUserId = searchParams.get('userId') || '';
  const selectedUserName = searchParams.get('userName') || '';

  const [overview, setOverview] = useState<DashboardOverview>(emptyOverview);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [performanceError, setPerformanceError] = useState('');

  useEffect(() => {
    let isActive = true;

    const fetchOverview = async () => {
      setLoadingOverview(true);
      try {
        const res = await apiClient.get('/dashboard/overview/');
        if (isActive) {
          setOverview(res.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard overview:', err);
      } finally {
        if (isActive) {
          setLoadingOverview(false);
        }
      }
    };

    fetchOverview();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchPerformance = async () => {
      if (!selectedUserId) {
        setPerformanceData(null);
        setPerformanceError('');
        setLoadingPerformance(false);
        return;
      }

      setLoadingPerformance(true);
      setPerformanceError('');

      try {
        const res = await apiClient.get(`/dashboard/user-performance/?query=${encodeURIComponent(selectedUserId)}`);
        if (isActive) {
          setPerformanceData(res.data);
        }
      } catch (err) {
        console.error('Failed to load user performance:', err);
        if (isActive) {
          setPerformanceData(null);
          setPerformanceError('User performance could not be loaded.');
        }
      } finally {
        if (isActive) {
          setLoadingPerformance(false);
        }
      }
    };

    fetchPerformance();

    return () => {
      isActive = false;
    };
  }, [selectedUserId]);

  const summaryCards = [
    {
      label: 'Clients',
      value: formatNumber(overview.summary.total_clients),
      meta: 'Total client records',
      icon: <Users size={16} />,
      onClick: () => navigate('/clients'),
    },
    {
      label: 'Bookings',
      value: formatNumber(overview.summary.total_bookings),
      meta: `Today: ${formatNumber(overview.summary.today_bookings)}`,
      icon: <Calendar size={16} />,
      onClick: () => navigate('/bookings'),
    },
    {
      label: 'Pending',
      value: formatNumber(overview.summary.pending_bookings),
      meta: 'Needs follow-up',
      icon: <Clock3 size={16} />,
      onClick: () => navigate('/bookings?status=pending'),
    },
    {
      label: 'Completed',
      value: formatNumber(overview.summary.completed_bookings),
      meta: `Today leads: ${formatNumber(overview.summary.today_leads)}`,
      icon: <CheckCircle2 size={16} />,
      onClick: () => navigate('/bookings?status=completed'),
    },
    {
      label: 'Collections',
      value: formatCurrency(overview.summary.total_collections),
      meta: 'Booking-linked payments',
      icon: <IndianRupee size={16} />,
      onClick: () => navigate('/payments'),
    },
  ];

  const topServices = overview.service_revenue.slice(0, 6);
  const topBdes = overview.bde_performance.slice(0, 5);
  const topBdms = overview.bdm_performance.slice(0, 5);

  if (loadingOverview) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="card h-24 animate-pulse bg-slate-100" />
          ))}
        </div>
        <div className="card h-80 animate-pulse bg-slate-100" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="card h-80 animate-pulse bg-slate-100" />
          <div className="card h-80 animate-pulse bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={card.onClick}
            className="card flex min-h-[96px] flex-col items-start justify-between p-4 text-left hover:border-slate-200 hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              {card.icon}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
              <p className="text-xl font-semibold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500">{card.meta}</p>
            </div>
          </button>
        ))}
      </section>

      <section className="card p-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Revenue by service</h2>
            <p className="text-sm text-slate-500">Top services ranked by collected booking revenue.</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-medium text-slate-500">Total collections</p>
            <p className="text-lg font-semibold text-slate-900">
              {formatCurrency(overview.summary.total_collections)}
            </p>
          </div>
        </div>

        {topServices.length > 0 ? (
          <div className="space-y-4">
            {topServices.map((service) => (
              <RevenueRow
                key={service.service_id}
                item={service}
                maxValue={topServices[0]?.revenue || 0}
              />
            ))}
          </div>
        ) : (
          <EmptyState message="No service revenue is available yet." />
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RankingCard
          title="BDE performance"
          description="Ranked by leads created."
          emptyMessage="No BDE activity found."
          items={topBdes}
          renderMeta={(item) => `${formatNumber(item.won_count)} won`}
          renderValue={(item) => `${formatNumber(item.lead_count)} leads`}
        />

        <RankingCard
          title="BDM performance"
          description="Ranked by revenue collection."
          emptyMessage="No BDM collections found."
          items={topBdms}
          renderMeta={(item) => `${formatNumber(item.bookings_count)} bookings`}
          renderValue={(item) => formatCurrency(item.revenue)}
        />
      </section>

      {selectedUserId && (
        <>
          {loadingPerformance && (
            <div className="card p-4">
              <h2 className="text-base font-semibold text-slate-900">User performance</h2>
              <p className="mt-2 text-sm text-slate-500">Loading performance for {selectedUserName || 'selected user'}...</p>
            </div>
          )}

          {!loadingPerformance && performanceError && (
            <div className="card p-4">
              <h2 className="text-base font-semibold text-slate-900">User performance</h2>
              <p className="mt-2 text-sm text-rose-600">{performanceError}</p>
            </div>
          )}

          {!loadingPerformance && !performanceError && performanceData && (
            <PerformancePanel data={performanceData} />
          )}
        </>
      )}
    </div>
  );
};

const RevenueRow: React.FC<{ item: ServiceRevenueItem; maxValue: number }> = ({ item, maxValue }) => {
  const width = maxValue > 0 ? Math.max((item.revenue / maxValue) * 100, 6) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
          <p className="text-xs text-slate-500">{formatNumber(item.payments_count)} payments</p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-slate-900">{formatCurrency(item.revenue)}</p>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-indigo-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

interface RankingCardProps<T extends { user_id: string; name: string }> {
  title: string;
  description: string;
  emptyMessage: string;
  items: T[];
  renderMeta: (item: T) => string;
  renderValue: (item: T) => string;
}

const RankingCard = <T extends { user_id: string; name: string },>({
  title,
  description,
  emptyMessage,
  items,
  renderMeta,
  renderValue,
}: RankingCardProps<T>) => (
  <div className="card p-4">
    <div className="mb-4">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>
    </div>

    {items.length > 0 ? (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.user_id}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                {index + 1}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-500">{renderMeta(item)}</p>
              </div>
            </div>
            <p className="shrink-0 text-sm font-semibold text-slate-900">{renderValue(item)}</p>
          </div>
        ))}
      </div>
    ) : (
      <EmptyState message={emptyMessage} />
    )}
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
    {message}
  </div>
);

export default AdminDashboard;
