import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const BookingNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isListPage = location.pathname === '/bookings';
  const isFormPage = location.pathname === '/bookings/new' || /^\/bookings\/[^/]+\/edit$/.test(location.pathname);

  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => navigate('/bookings')}
        className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
          isListPage ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        Booking List
      </button>
      <button
        type="button"
        onClick={() => navigate('/bookings/new')}
        className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
          isFormPage ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        Booking Form
      </button>
    </div>
  );
};

export default BookingNavigation;
