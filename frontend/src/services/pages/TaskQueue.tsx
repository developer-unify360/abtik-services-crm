import React, { useEffect, useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { useServiceStore } from '../store/useServiceStore';
import { UserPlus, Clock, CheckCircle2, AlertCircle, Search, MoreVertical } from 'lucide-react';

const TaskQueue: React.FC = () => {
  const { tasks, isLoading, fetchTasks, updateTaskStatus } = useTaskStore();
  const { fetchCategories } = useServiceStore();
  
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: ''
  });

  const [showStatusModal, setShowStatusModal] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks(filters);
    fetchCategories();
  }, [fetchTasks, fetchCategories, filters]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'assigned': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'urgent': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle size={14} className="text-rose-500" />;
      case 'high': return <AlertCircle size={14} className="text-amber-500" />;
      default: return <Clock size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Task Queue</h1>
          <p className="text-slate-500 mt-1">Monitor and manage all active service requests</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none w-full md:w-64 transition-all"
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
          <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <select 
              className="bg-transparent border-none text-sm font-semibold text-slate-600 focus:ring-0 cursor-pointer px-2"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <div className="w-px h-4 bg-slate-200"></div>
            <select 
              className="bg-transparent border-none text-sm font-semibold text-slate-600 focus:ring-0 cursor-pointer px-2"
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value})}
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Service Request</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client & Booking</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assignee</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                   <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex justify-center mb-2"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div></div>
                      Loading tasks...
                   </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No active tasks match your filters.
                  </td>
                </tr>
              ) : tasks.map(task => (
                <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-bold text-slate-800">{task.service_name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-bold ${getStatusColor(task.priority)}`}>
                          {getPriorityIcon(task.priority)}
                          {task.priority.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-slate-400 font-medium">{task.category_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-700">{task.booking_details?.client_name || 'Client Name'}</span>
                      <span className="text-xs text-slate-400 mt-0.5">Booking ID: {task.booking.slice(0, 8)}...</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {task.assigned_user ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold border border-indigo-200">
                          {task.assigned_user.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{task.assigned_user.name}</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {}}
                        className="flex items-center space-x-1.5 text-slate-400 hover:text-indigo-600 transition-colors text-sm font-medium"
                      >
                        <UserPlus size={16} />
                        <span>Unassigned</span>
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <button 
                      onClick={() => setShowStatusModal(task.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(task.status)} uppercase tracking-wide hover:opacity-80 transition-opacity`}
                    >
                      {task.status.replace('_', ' ')}
                    </button>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simplified Status Selection Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Update Status</h3>
            <div className="space-y-2">
              {['pending', 'assigned', 'in_progress', 'completed'].map(s => (
                <button 
                  key={s}
                  className="w-full text-left px-4 py-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all font-semibold text-slate-700 flex items-center justify-between"
                  onClick={() => {
                    updateTaskStatus(showStatusModal, s);
                    setShowStatusModal(null);
                  }}
                >
                  <span className="capitalize">{s.replace('_', ' ')}</span>
                  {s === 'completed' && <CheckCircle2 size={16} className="text-emerald-500" />}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowStatusModal(null)}
              className="mt-4 w-full py-2 text-slate-500 font-medium hover:text-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskQueue;
