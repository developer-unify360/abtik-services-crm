import React, { useState } from 'react';
import { Layers, Building2, UserPlus2, CreditCard, Wrench } from 'lucide-react';
import AttributeTable from './AttributeTable';
import BanksPage from '../bookings/BanksPage';
import ServiceManagement from '../services/pages/ServiceManagement';

const AttributesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'industries' | 'leadSources' | 'banks' | 'paymentTypes' | 'services'>('industries');

  const tabs = [
    { id: 'industries', label: 'Industries', icon: <Building2 size={18} /> },
    { id: 'leadSources', label: 'Lead Sources', icon: <UserPlus2 size={18} /> },
    { id: 'banks', label: 'Banks', icon: <CreditCard size={18} /> },
    { id: 'paymentTypes', label: 'Payment Types', icon: <CreditCard size={18} /> },
    { id: 'services', label: 'Services', icon: <Wrench size={18} /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'industries':
        return <AttributeTable title="Industry" type="industry" />;
      case 'leadSources':
        return <AttributeTable title="Lead Source" type="leadSource" />;
      case 'paymentTypes':
        return <AttributeTable title="Payment Type" type="paymentType" />;
      case 'banks':
        return (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
             <BanksPage />
          </div>
        );
      case 'services':
        return (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <ServiceManagement />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-20 -mt-20 blur-3xl -z-1" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl rotate-3 flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">System Attributes</h1>
            <p className="text-slate-500 text-sm mt-1">Manage core configuration and master data</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm w-fit overflow-x-auto max-w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap
              ${activeTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-left-2 duration-300">
        {renderContent()}
      </div>
    </div>
  );
};

export default AttributesPage;
