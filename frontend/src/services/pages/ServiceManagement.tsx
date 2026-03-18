import React, { useEffect, useState } from 'react';
import { useServiceStore } from '../store/useServiceStore';
import { Plus, Delete, Edit, ChevronRight, Settings, X } from 'lucide-react';

const ServiceManagement: React.FC = () => {
  const {
    categories, services, isLoading, fetchCategories, fetchServices,
    createCategory, updateCategory, deleteCategory,
    createService, updateService, deleteService
  } = useServiceStore();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [modalData, setModalData] = useState<any>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({
    open: false, message: '', type: 'success',
  });

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (selectedCategory) {
      fetchServices(selectedCategory);
    } else {
      fetchServices();
    }
  }, [selectedCategory, fetchServices]);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalData.id) {
        await updateCategory(modalData.id, modalData);
        setSnackbar({ open: true, message: 'Category updated successfully', type: 'success' });
      } else {
        await createCategory(modalData);
        setSnackbar({ open: true, message: 'Category created successfully', type: 'success' });
      }
      setShowCategoryModal(false);
      setModalData({});
      fetchCategories();
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Operation failed', type: 'error' });
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...modalData, category: modalData.category || selectedCategory };
    try {
      if (modalData.id) {
        await updateService(modalData.id, data);
        setSnackbar({ open: true, message: 'Service updated successfully', type: 'success' });
      } else {
        await createService(data);
        setSnackbar({ open: true, message: 'Service created successfully', type: 'success' });
      }
      setShowServiceModal(false);
      setModalData({});
      fetchServices(selectedCategory || undefined);
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Operation failed', type: 'error' });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory(id);
        setSnackbar({ open: true, message: 'Category deleted successfully', type: 'success' });
        if (selectedCategory === id) {
          setSelectedCategory(null);
        }
        fetchCategories();
      } catch (err: any) {
        setSnackbar({ open: true, message: 'Failed to delete category', type: 'error' });
      }
    }
  };

  const handleDeleteService = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await deleteService(id);
        setSnackbar({ open: true, message: 'Service deleted successfully', type: 'success' });
        fetchServices(selectedCategory || undefined);
      } catch (err: any) {
        setSnackbar({ open: true, message: 'Failed to delete service', type: 'error' });
      }
    }
  };

  const categoryList = Array.isArray(categories) ? categories : [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Service Catalog</h1>
          <p className="text-gray-500 mt-1">Manage your service offerings and categories</p>
        </div>
        <button 
          onClick={() => { setModalData({}); setShowCategoryModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          New Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="md:col-span-1">
          <div className="card !p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-slate-800">Categories</h3>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  !selectedCategory ? 'bg-indigo-50 text-indigo-600 border-r-2 border-indigo-600' : 'text-gray-600'
                }`}
              >
                <span className="font-medium">All Services</span>
                <ChevronRight size={16} />
              </button>
              {categoryList.map((cat) => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between px-4 py-3 border-t border-gray-100 ${
                    selectedCategory === cat.id 
                      ? 'bg-indigo-50 text-indigo-600 border-r-2 border-indigo-600' 
                      : 'hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <button
                    onClick={() => setSelectedCategory(cat.id)}
                    className="flex-1 text-left font-medium"
                  >
                    {cat.name}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setModalData(cat); setShowCategoryModal(true); }}
                      className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Delete size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Services List */}
        <div className="md:col-span-3">
          {/* Services Header */}
          <div className="card mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">
                {selectedCategory
                  ? categoryList.find(c => c.id === selectedCategory)?.name
                  : 'All Services'}
              </h3>
              <button
                onClick={() => { setModalData({ category: selectedCategory }); setShowServiceModal(true); }}
                className="text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
              >
                <Plus size={18} />
                Add Service
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Array.isArray(services) ? services : []).map((service) => (
                <div key={service.id} className="card group relative hover:shadow-md transition-shadow">
                  {/* Actions */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setModalData(service); setShowServiceModal(true); }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Delete size={16} />
                    </button>
                  </div>
                  
                  {/* Service Content */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                      <Settings size={20} />
                    </div>
                    <h4 className="font-semibold text-slate-800 pr-8">{service.name}</h4>
                  </div>
                  <p className="text-sm text-gray-500 mb-3 min-h-[40px] line-clamp-2">
                    {service.description || 'No description provided.'}
                  </p>
                  <div className="pt-3 border-t border-gray-100">
                    <span className="badge badge-gray">{service.category_name}</span>
                  </div>
                </div>
              ))}
              {services.length === 0 && (
                <div className="col-span-full">
                  <div className="card border-2 border-dashed border-gray-200 text-center py-12">
                    <div className="flex flex-col items-center">
                      <Plus size={40} className="text-gray-300 mb-2" />
                      <p className="text-gray-500 font-medium">No services found</p>
                      <p className="text-gray-400 text-sm mt-1">Start by adding your first service to this category.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-slate-800">
                {modalData.id ? 'Edit Category' : 'New Category'}
              </h2>
              <button 
                onClick={() => setShowCategoryModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={modalData.name || ''}
                  onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={modalData.description || ''}
                  onChange={(e) => setModalData({ ...modalData, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-slate-800">
                {modalData.id ? 'Edit Service' : 'New Service'}
              </h2>
              <button 
                onClick={() => setShowServiceModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveService} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  className="input-field"
                  value={modalData.category || selectedCategory || ''}
                  onChange={(e) => setModalData({ ...modalData, category: e.target.value })}
                >
                  <option value="">Select a category</option>
                  {categoryList.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={modalData.name || ''}
                  onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={modalData.description || ''}
                  onChange={(e) => setModalData({ ...modalData, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowServiceModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Service</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {snackbar.open && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg ${
          snackbar.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white flex items-center gap-3 z-50`}>
          <span>{snackbar.message}</span>
          <button onClick={() => setSnackbar({ ...snackbar, open: false })}>
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ServiceManagement;
