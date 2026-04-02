import React from 'react';

interface ChartContainerProps {
  title: string;
  data: number[];
  labels: string[];
  unit?: string;
  color?: string;
}

const ChartContainer: React.FC<ChartContainerProps> = ({ title, data, labels, unit = 'Units', color = 'bg-indigo-500' }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{title}</h3>
        <div className="flex items-center gap-1.5 grayscale opacity-50">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{unit}</span>
        </div>
      </div>
      <div className="flex items-end justify-between h-40 gap-2 group/chart mt-auto">
        {data.map((val, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center group relative h-full">
            <div className="flex-1 w-full flex flex-col justify-end translate-y-0 group-hover:-translate-y-1 transition-transform duration-300">
               <div 
                 style={{ height: `${(val/max)*100}%` }} 
                 className={`w-full ${color} opacity-80 group-hover:opacity-100 rounded-lg transition-all duration-300 relative shadow-sm`}
               >
                 <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 whitespace-nowrap shadow-xl">
                   {val} {unit}
                 </div>
               </div>
            </div>
            <span className="text-[8px] text-slate-400 mt-2 font-black uppercase tracking-tighter truncate w-full text-center group-hover:text-slate-800">{labels[idx]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartContainer;
