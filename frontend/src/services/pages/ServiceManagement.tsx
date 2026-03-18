import React, { useEffect, useState } from 'react';
import { useServiceStore } from '../store/useServiceStore';
import { Plus, Trash2, Edit2, ChevronRight, Settings } from 'lucide-react';

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
    if (modalData.id) {
      await updateCategory(modalData.id, modalData);
    } else {
      await createCategory(modalData);
    }
    setShowCategoryModal(false);
    setModalData({});
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...modalData, category: modalData.category || selectedCategory };
    if (modalData.id) {
      await updateService(modalData.id, data);
    } else {
      await createService(data);
    }
    setShowServiceModal(false);
    setModalData({});
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">Service Catalog</h1>
          <p className="text-slate-500 mt-1">Manage your service offerings and categories</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => { setModalData({}); setShowCategoryModal(true); }}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all shadow-sm"
          >
            <Plus size={18} />
            <span>New Category</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">Categories</h2>
          </div>
          <div className="divide-y divide-slate-50">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors ${!selectedCategory ? 'bg-indigo-50/50 text-indigo-700 border-r-4 border-indigo-600' : 'text-slate-600'}`}
            >
              <span className="font-medium">All Services</span>
              <ChevronRight size={16} />
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors ${selectedCategory === cat.id ? 'bg-indigo-50/50 text-indigo-700 border-r-4 border-indigo-600' : 'text-slate-600'}`}
              >
                <span className="font-medium truncate">{cat.name}</span>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   {/* Edit/Delete icons could go here on hover */}
                </div>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </div>

        {/* Services List */}
        <div className="md:col-span-3 space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800">
              {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'All Services'}
            </h2>
            <button 
              onClick={() => { setModalData({ category: selectedCategory }); setShowServiceModal(true); }}
              className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 font-medium py-2 px-3 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Plus size={18} />
              <span>Add Service</span>
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map(service => (
                <div key={service.id} className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    <button 
                      onClick={() => { setModalData(service); setShowServiceModal(true); }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => deleteService(service.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Settings size={20} />
                    </div>
                    <h3 className="font-bold text-slate-800 truncate pr-8">{service.name}</h3>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem]">
                    {service.description || 'No description provided.'}
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-400">
                    <span>{service.category_name}</span>
                  </div>
                </div>
              ))}
              {services.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-xl border border-dashed border-slate-300">
                  <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-3">
                    <Plus size={24} />
                  </div>
                  <h3 className="text-slate-600 font-medium">No services found</h3>
                  <p className="text-slate-400 text-sm mt-1">Start by adding your first service to this category.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category Modal - simplified for brevity */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">{modalData.id ? 'Edit Category' : 'New Category'}</h3>
            </div>
            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Name</label>
                <input 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="e.g. Digital Marketing"
                  value={modalData.name || ''}
                  onChange={e => setModalData({...modalData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all h-24 resize-none"
                  placeholder="What does this category cover?"
                  value={modalData.description || ''}
                  onChange={e => setModalData({...modalData, description: e.target.value})}
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 px-4 py-2 text-slate-600 font-semibold hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">{modalData.id ? 'Edit Service' : 'New Service'}</h3>
            </div>
            <form onSubmit={handleSaveService} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                <select 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-white"
                  value={modalData.category || selectedCategory || ''}
                  onChange={e => setModalData({...modalData, category: e.target.value})}
                >
                  <option value="">Select a category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Service Name</label>
                <input 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="e.g. Website Design"
                  value={modalData.name || ''}
                  onChange={e => setModalData({...modalData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all h-24 resize-none"
                  placeholder="Brief service description..."
                  value={modalData.description || ''}
                  onChange={e => setModalData({...modalData, description: e.target.value})}
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="flex-1 px-4 py-2 text-slate-600 font-semibold hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceManagement;
