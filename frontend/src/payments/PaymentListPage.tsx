import React, { useEffect, useState } from 'react';
import { ArrowUpRight, CreditCard, PencilLine, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { PaymentService, type Payment } from './PaymentService';

const sourceStyles: Record<string, { bg: string; color: string }> = {
  booking: { bg: 'bg-blue-100', color: 'text-blue-700' },
  manual: { bg: 'bg-emerald-100', color: 'text-emerald-700' },
};

const formatCurrency = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return value;
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(numericValue);
};

const PaymentListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({
    open: false,
    message: '',
    type: 'success',
  });

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: String(page + 1),
        page_size: String(rowsPerPage),
      };

      if (search) {
        params.search = search;
      }
      if (sourceFilter) {
        params.source = sourceFilter;
      }

      const data = await PaymentService.list(params);
      const items = data.results || data;
      setPayments(items);
      setTotalCount(data.count || items.length);
    } catch (error) {
      console.error('Failed to load payments:', error);
      setSnackbar({ open: true, message: 'Unable to load payments.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, search, sourceFilter]);

  useEffect(() => {
    if (location.state?.toast) {
      setSnackbar({
        open: true,
        message: location.state.toast,
        type: location.state.toastType || 'success',
      });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  return (
    <div className="flex min-w-0 flex-col h-full min-h-0 space-y-3 overflow-x-hidden">
      <div className="shrink-0 w-full">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Finance View</p>
          <div className="mt-4 flex min-w-0 items-start justify-between gap-3">
            <h1 className="min-w-0 text-2xl font-bold text-slate-900">Payments</h1>
            <button
              onClick={() => navigate('/payments/new')}
              className="page-header-action bg-emerald-600 hover:bg-emerald-700"
            >
              <CreditCard size={12} />
              New Payment
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Booking-linked payments recorded automatically. Manual payments can be added here.
          </p>
        </div>
      </div>

      <div className="table-scroll shrink-0 min-w-0 overflow-x-auto rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex gap-2 items-center min-w-[600px]">
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative w-56 shrink-0">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input-field pl-8 py-1.5 text-sm w-56 shrink-0"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Search..."
              />
            </div>
            <select
              className="input-field py-1.5 text-sm w-28 shrink-0"
              value={sourceFilter}
              onChange={(event) => {
                setSourceFilter(event.target.value);
                setPage(0);
              }}
            >
              <option value="">All</option>
              <option value="booking">Booking</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <span className="text-xs text-slate-500">
            {totalCount === 0 ? '0 records' : `${totalCount} total`}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 min-h-0 w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="table-scroll min-w-0 flex-1 min-h-0 overflow-auto">
          <table className="w-full min-w-[1000px]">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="text-xs font-semibold text-slate-600">
                  <th className="px-3 py-2 text-left whitespace-nowrap">Client</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap table-cell">Company</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Source</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Type</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap table-cell">Date</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">Received</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap table-cell">Remaining</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap table-cell">Ref</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                      No payments found.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => {
                    const sourceStyle = sourceStyles[payment.source] || { bg: 'bg-slate-100', color: 'text-slate-700' };

                    return (
                      <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{payment.client_name || '—'}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap max-w-[120px] truncate">{payment.company_name || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`badge ${sourceStyle.bg} ${sourceStyle.color} text-[10px] px-1.5 py-0.5`}>
                            {payment.source === 'booking' ? 'BKG' : 'MAN'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{payment.payment_type_name || '—'}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                          {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap">{formatCurrency(payment.received_amount)}</td>
                        <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap">{formatCurrency(payment.remaining_amount)}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap max-w-[100px] truncate" title={payment.reference_number || ''}>
                          {payment.reference_number || (payment.booking_id ? payment.booking_id.slice(0, 8) : '—')}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {payment.is_editable ? (
                            <button
                              onClick={() => navigate(`/payments/${payment.id}/edit`)}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                            >
                              <PencilLine size={12} />
                              Edit
                            </button>
                          ) : (
                            <button
                              onClick={() => payment.booking_id && navigate(`/bookings/${payment.booking_id}/edit`)}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                            >
                              <ArrowUpRight size={12} />
                              Open
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
        </div>

        {totalCount > rowsPerPage && (
          <div className="flex min-w-0 flex-col gap-2 border-t border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-slate-500">
              {`${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, totalCount)} of ${totalCount}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
                disabled={page === 0}
                className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((currentPage) => ((page + 1) * rowsPerPage < totalCount ? currentPage + 1 : currentPage))}
                disabled={(page + 1) * rowsPerPage >= totalCount}
                className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {snackbar.open ? (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white shadow-lg ${snackbar.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
          <span>{snackbar.message}</span>
          <button onClick={() => setSnackbar({ ...snackbar, open: false })} className="font-medium underline">
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default PaymentListPage;
