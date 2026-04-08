import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';

import type { Service } from '../api/ServiceApi';
import { useServiceStore } from '../store/useServiceStore';

const getErrorMessage = (error: any, fallback: string) => (
  error?.response?.data?.error?.message
  || error?.response?.data?.detail
  || error?.message
  || fallback
);

const ServiceManagement: React.FC = () => {
  const { services, isLoading, error, fetchServices, createService, updateService, deleteService } = useServiceStore();

  const [draftName, setDraftName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({
    open: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const serviceList = Array.isArray(services) ? services : [];
  const filteredServices = useMemo(
    () => serviceList.filter((service) => service.name.toLowerCase().includes(searchTerm.trim().toLowerCase())),
    [serviceList, searchTerm],
  );

  const closeSnackbar = () => {
    setSnackbar((current) => ({ ...current, open: false }));
  };

  const showError = (message: string) => {
    setSnackbar({ open: true, message, type: 'error' });
  };

  const handleCreateService = async (event: React.FormEvent) => {
    event.preventDefault();

    const name = draftName.trim();
    if (!name) {
      showError('Enter a service name before saving.');
      return;
    }

    try {
      await createService({ name });
      setDraftName('');
      setSnackbar({ open: true, message: 'Service added successfully.', type: 'success' });
    } catch (createError: any) {
      showError(getErrorMessage(createError, 'Unable to add service right now.'));
    }
  };

  const startEditing = (service: Service) => {
    setEditingId(service.id);
    setEditingName(service.name);
  };

  const stopEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleRenameService = async (serviceId: string) => {
    const name = editingName.trim();
    if (!name) {
      showError('Service name cannot be empty.');
      return;
    }

    try {
      await updateService(serviceId, { name });
      stopEditing();
      setSnackbar({ open: true, message: 'Service updated successfully.', type: 'success' });
    } catch (updateError: any) {
      showError(getErrorMessage(updateError, 'Unable to update service right now.'));
    }
  };

  const handleDeleteService = async (service: Service) => {
    if (!window.confirm(`Delete "${service.name}"?`)) {
      return;
    }

    try {
      await deleteService(service.id);
      if (editingId === service.id) {
        stopEditing();
      }
      setSnackbar({ open: true, message: 'Service deleted successfully.', type: 'success' });
    } catch (deleteError: any) {
      showError(getErrorMessage(deleteError, 'Unable to delete service right now.'));
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                <ShieldCheck size={22} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-900">
                  Quick Add Service
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Only the service name is required. Press Enter to save fast.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateService} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                className="input-field"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Add a service name"
              />
              <button type="submit" className="btn-primary flex items-center justify-center gap-2 sm:min-w-[160px]">
                <Plus size={18} />
                Add Service
              </button>
            </form>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Find Service</span>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  className="input-field pl-10"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by service name"
                />
              </div>
            </label>

            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {filteredServices.length === serviceList.length
                ? `${serviceList.length} services available`
                : `${filteredServices.length} matching services`}
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">Service List</h2>
          <p className="mt-1 text-sm text-slate-600">Short, clean names work best because they appear throughout the CRM.</p>
        </div>

        {isLoading ? (
          <div className="px-6 py-14 text-center text-slate-500">Loading services...</div>
        ) : filteredServices.length === 0 ? (
          <div className="px-6 py-14">
            <div className="rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                <Wrench size={24} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {serviceList.length === 0 ? 'No services yet' : 'No matching services'}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {serviceList.length === 0
                  ? 'Create your first service with a simple name like Website Development or GST Filing.'
                  : 'Try another search term to find the service you need.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredServices.map((service) => (
              <div key={service.id} className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                    <Wrench size={20} />
                  </div>
                  <div className="min-w-0">
                    {editingId === service.id ? (
                      <input
                        type="text"
                        className="input-field"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        autoFocus
                      />
                    ) : (
                      <p className="text-base font-semibold text-slate-900">{service.name}</p>
                    )}

                    {service.category_name ? (
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                        Legacy category: {service.category_name}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">Available for booking and request selection.</p>
                    )}
                  </div>
                </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {editingId === service.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRenameService(service.id)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100"
                          title="Save"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={stopEditing}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
                          title="Cancel"
                        >
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditing(service)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200"
                          title="Rename"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(service)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 transition-colors hover:bg-red-100"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {snackbar.open ? (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-lg ${snackbar.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
            }`}
        >
          <span>{snackbar.message}</span>
          <button type="button" onClick={closeSnackbar}>
            <X size={18} />
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default ServiceManagement;
