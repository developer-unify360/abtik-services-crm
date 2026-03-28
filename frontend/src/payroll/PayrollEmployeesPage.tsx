import React, { useEffect, useState } from 'react';
import { PencilLine, Plus, RefreshCcw, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { PayrollService, type PayrollConfiguration, type PayrollEmployee } from './PayrollService';
import { currencyFormatter, Panel, PayrollWorkspace } from './payrollShared';

const PayrollEmployeesPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [configuration, setConfiguration] = useState<PayrollConfiguration | null>(null);
  const [pageError, setPageError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setPageError('');
      const [configurationResponse, employeeResponse] = await Promise.all([
        PayrollService.getConfiguration(),
        PayrollService.listEmployees({ page_size: '200' }),
      ]);

      setConfiguration(configurationResponse);
      setEmployees(employeeResponse.results || employeeResponse);
    } catch (error) {
      console.error('Failed to load payroll employees:', error);
      setPageError('Unable to load payroll employees right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const deleteEmployee = async (employee: PayrollEmployee) => {
    if (!window.confirm(`Delete ${employee.full_name}?`)) {
      return;
    }

    try {
      await PayrollService.deleteEmployee(employee.id);
      setEmployees((previous) => previous.filter((item) => item.id !== employee.id));
    } catch (error) {
      console.error('Failed to delete employee:', error);
      setPageError('Unable to delete employee. If payslips already exist, mark the employee inactive instead.');
    }
  };

  return (
    <PayrollWorkspace
      title="Employees"
      actions={(
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw size={14} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate('/payroll/employees/new')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus size={14} />
            Add Employee
          </button>
        </div>
      )}
    >
      {pageError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</div> : null}

      <Panel
        title="Employee List"
        icon={<Users size={18} />}
      >
        {loading ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Loading employee list...
          </div>
        ) : (
          <div className="table-scroll overflow-auto rounded-lg border border-slate-200">
            <table className="w-full table-fixed">
              <thead className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-2 py-2">Code</th>
                  <th className="px-2 py-2">Employee</th>
                  <th className="px-2 py-2">Department</th>
                  <th className="px-2 py-2">Designation</th>
                  <th className="px-2 py-2">Custom Rules</th>
                  <th className="px-2 py-2 text-right">CTC</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {employees.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">No employees added yet.</td></tr>
                ) : employees.map((employee) => (
                  <tr key={employee.id} className="border-t border-slate-100">
                    <td className="px-2 py-2 font-medium text-slate-800">{employee.employee_code}</td>
                    <td className="px-2 py-2">{employee.full_name}</td>
                    <td className="px-2 py-2 text-slate-600">{employee.department || '-'}</td>
                    <td className="px-2 py-2 text-slate-600">{employee.designation || '-'}</td>
                    <td className="px-2 py-2 text-slate-600">
                      <span className="block max-w-[220px] truncate" title={(employee.custom_salary_components || []).map((rule) => rule.name).join(', ')}>
                        {(employee.custom_salary_components || []).length > 0 ? (employee.custom_salary_components || []).map((rule) => rule.name).join(', ') : '-'}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right text-slate-700">
                      {currencyFormatter(employee.annual_ctc, configuration?.currency || 'INR')}
                    </td>
                    <td className="px-2 py-2">
                      <span className={`badge ${employee.is_active ? 'badge-success' : 'badge-gray'}`}>
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => navigate(`/payroll/employees/${employee.id}/edit`)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
                          <PencilLine size={12} />
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteEmployee(employee)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </PayrollWorkspace>
  );
};

export default PayrollEmployeesPage;
