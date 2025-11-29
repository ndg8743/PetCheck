import React, { useMemo } from 'react';

export interface BarChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartProps {
  data: BarChartDataPoint[];
  title?: string;
  height?: number;
  orientation?: 'vertical' | 'horizontal';
  showValues?: boolean;
  showLabels?: boolean;
  className?: string;
  emptyMessage?: string;
  colorPalette?: string[];
}

const defaultColorPalette = [
  '#0891b2', // primary-600
  '#0d9488', // secondary-600
  '#f59e0b', // warning-500
  '#ef4444', // accent-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
];

export const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  height = 300,
  orientation = 'vertical',
  showValues = true,
  showLabels = true,
  className = '',
  emptyMessage = 'No data available',
  colorPalette = defaultColorPalette,
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const maxValue = Math.max(...data.map((d) => d.value));

    return {
      maxValue,
      items: data.map((item, index) => ({
        ...item,
        color: item.color || colorPalette[index % colorPalette.length],
        percentage: (item.value / maxValue) * 100,
      })),
    };
  }, [data, colorPalette]);

  if (!chartData) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800/50 ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  // Horizontal bar chart
  if (orientation === 'horizontal') {
    return (
      <div className={className}>
        {title && (
          <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-4 font-display">
            {title}
          </h3>
        )}
        <div className="space-y-4">
          {chartData.items.map((item, index) => (
            <div key={index} className="group">
              <div className="flex items-center justify-between mb-1.5">
                {showLabels && (
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate pr-4 max-w-[200px]">
                    {item.label}
                  </span>
                )}
                {showValues && (
                  <span className="text-sm font-semibold text-navy-900 dark:text-white tabular-nums">
                    {item.value.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="relative w-full h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500 ease-out group-hover:opacity-90"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                  role="progressbar"
                  aria-valuenow={item.value}
                  aria-valuemin={0}
                  aria-valuemax={chartData.maxValue}
                  aria-label={`${item.label}: ${item.value}`}
                />
                {/* Inner highlight */}
                <div
                  className="absolute inset-y-0 left-0 rounded-lg opacity-30"
                  style={{
                    width: `${item.percentage}%`,
                    background: `linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Vertical bar chart (SVG)
  const padding = { top: 30, right: 20, bottom: 60, left: 50 };
  const chartWidth = 800;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = (chartWidth / data.length) * 0.65;
  const barSpacing = chartWidth / data.length;

  return (
    <div className={className}>
      {title && (
        <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-4 font-display">
          {title}
        </h3>
      )}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${chartWidth + padding.left + padding.right} ${height}`}
        className="overflow-visible"
        role="img"
        aria-label={title || 'Bar chart'}
      >
        {/* Y-axis line */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
          strokeWidth="1"
        />

        {/* X-axis line */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={chartWidth + padding.left}
          y2={height - padding.bottom}
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
          strokeWidth="1"
        />

        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding.top + chartHeight * (1 - ratio);
          const value = Math.round(chartData.maxValue * ratio);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth + padding.left}
                y2={y}
                stroke="currentColor"
                className="text-gray-100 dark:text-gray-800"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 10}
                y={y}
                textAnchor="end"
                alignmentBaseline="middle"
                className="text-xs fill-gray-500 dark:fill-gray-400"
              >
                {value.toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {chartData.items.map((item, index) => {
          const barHeight = (item.value / chartData.maxValue) * chartHeight;
          const x = padding.left + index * barSpacing + (barSpacing - barWidth) / 2;
          const y = height - padding.bottom - barHeight;

          return (
            <g key={index} className="group">
              {/* Bar background for hover */}
              <rect
                x={x - 5}
                y={padding.top}
                width={barWidth + 10}
                height={chartHeight}
                fill="transparent"
                className="cursor-pointer"
              />

              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={item.color}
                rx="4"
                ry="4"
                className="transition-all duration-300 group-hover:opacity-80"
                role="graphics-symbol"
                aria-label={`${item.label}: ${item.value}`}
              >
                <title>{`${item.label}: ${item.value.toLocaleString()}`}</title>
              </rect>

              {/* Inner highlight */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                ry="4"
                fill="url(#barHighlight)"
                className="pointer-events-none"
              />

              {/* Value label */}
              {showValues && (
                <text
                  x={x + barWidth / 2}
                  y={y - 8}
                  textAnchor="middle"
                  className="text-sm fill-navy-900 dark:fill-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {item.value.toLocaleString()}
                </text>
              )}

              {/* X-axis label */}
              {showLabels && (
                <text
                  x={x + barWidth / 2}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                >
                  {item.label.length > 12 ? item.label.substring(0, 10) + '...' : item.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Highlight gradient */}
        <defs>
          <linearGradient id="barHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.2" />
            <stop offset="50%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

// Stat card with mini bar
export interface StatBarProps {
  label: string;
  value: number;
  maxValue: number;
  color?: string;
  suffix?: string;
  className?: string;
}

export const StatBar: React.FC<StatBarProps> = ({
  label,
  value,
  maxValue,
  color = '#0891b2',
  suffix = '',
  className = '',
}) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-navy-900 dark:text-white">
          {value.toLocaleString()}
          {suffix}
        </span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};
