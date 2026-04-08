import React from 'react';

interface ChartContainerProps {
  title: string;
  data: number[];
  labels: string[];
  unit?: string;
  color?: string;
  compact?: boolean;
  valueFormatter?: (value: number) => string;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  data,
  labels,
  unit = 'Units',
  color = 'bg-indigo-500',
  compact = false,
  valueFormatter,
}) => {
  const max = Math.max(...data, 1);
  const resolvedFormatter = valueFormatter || ((value: number) => `${value}`);

  return (
    <div className={`card ${compact ? 'p-3' : 'p-4'} h-full`}>
      <div className={`mb-4 flex items-center justify-between ${compact ? 'mb-3' : ''}`}>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{unit}</p>
        </div>
      </div>

      <div className={`mt-auto flex items-end gap-2 ${compact ? 'h-24' : 'h-44'}`}>
        {data.map((value, index) => (
          <div key={`${labels[index]}-${index}`} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="mb-2 text-[11px] font-medium text-slate-600">
              {resolvedFormatter(value)}
            </div>
            <div className="flex h-full w-full items-end rounded-md bg-slate-100 px-1">
              <div
                className={`w-full rounded-md ${color}`}
                style={{ height: `${(value / max) * 100}%` }}
                title={`${labels[index]}: ${resolvedFormatter(value)}`}
              />
            </div>
            <div className="mt-2 w-full truncate text-center text-[11px] text-slate-500">
              {labels[index]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartContainer;
