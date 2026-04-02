import React from 'react';

interface ChartContainerProps {
  title: string;
  data: number[];
  labels: string[];
  unit?: string;
  color?: string;
  compact?: boolean;
}

const ChartContainer: React.FC<ChartContainerProps> = ({ 
    title, data, labels, unit = 'Units', color = 'bg-indigo-500', compact = false 
}) => {
  const max = Math.max(...data, 1);
  return (
    <div className={`bg-white rounded-xl border border-slate-100 shadow-sm ${compact ? 'p-3' : 'p-5'} flex flex-col h-full`}>
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-4'}`}>
        <h3 className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-black text-slate-400 uppercase tracking-widest leading-none`}>{title}</h3>
        <div className="flex items-center gap-1 opacity-40">
            <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter">{unit}</span>
        </div>
      </div>
      <div className={`flex items-end justify-between ${compact ? 'h-24' : 'h-40'} gap-1.5 group/chart mt-auto`}>
        {data.map((val, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center group relative h-full">
            <div className={`flex-1 w-full flex flex-col justify-end translate-y-0 group-hover:-translate-y-0.5 transition-transform duration-300`}>
               <div 
                 style={{ height: `${(val/max)*100}%` }} 
                 className={`w-full ${color} opacity-70 group-hover:opacity-100 rounded-sm transition-all duration-300 relative shadow-sm`}
               >
                 <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 whitespace-nowrap z-10">
                   {val}{unit}
                 </div>
               </div>
            </div>
            <span className={`text-[7px] text-slate-400 mt-1.5 font-black uppercase tracking-tighter truncate w-full text-center group-hover:text-slate-800 transition-colors`}>{labels[idx]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartContainer;
