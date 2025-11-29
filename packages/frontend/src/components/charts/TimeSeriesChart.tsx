import React, { useMemo } from 'react';

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  height?: number;
  color?: string;
  gradientId?: string;
  showGrid?: boolean;
  showArea?: boolean;
  showDots?: boolean;
  className?: string;
  emptyMessage?: string;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  title,
  height = 300,
  color = '#0891b2', // primary-600
  gradientId = 'timeSeriesGradient',
  showGrid = true,
  showArea = true,
  showDots = true,
  className = '',
  emptyMessage = 'No data available',
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const maxValue = Math.max(...data.map((d) => d.value));
    const minValue = Math.min(...data.map((d) => d.value));
    const valueRange = maxValue - minValue || 1;

    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = 800;
    const chartHeight = height - padding.top - padding.bottom;
    const stepX = chartWidth / (data.length - 1 || 1);

    const points = data.map((point, index) => {
      const x = padding.left + index * stepX;
      const y = padding.top + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
      return { x, y, ...point };
    });

    const pathD = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x},${point.y}`)
      .join(' ');

    const areaD = `${pathD} L ${points[points.length - 1].x},${padding.top + chartHeight} L ${padding.left},${padding.top + chartHeight} Z`;

    // Calculate grid lines
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      y: padding.top + chartHeight * (1 - ratio),
      value: Math.round(minValue + valueRange * ratio),
    }));

    return {
      points,
      pathD,
      areaD,
      gridLines,
      padding,
      chartWidth: chartWidth + padding.left + padding.right,
      chartHeight: height,
      innerWidth: chartWidth,
      innerHeight: chartHeight,
    };
  }, [data, height]);

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

  return (
    <div className={className}>
      {title && (
        <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-4 font-display">
          {title}
        </h3>
      )}
      <div className="relative">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${chartData.chartWidth} ${chartData.chartHeight}`}
          className="overflow-visible"
          role="img"
          aria-label={title || 'Time series chart'}
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {showGrid && (
            <g>
              {chartData.gridLines.map((line, i) => (
                <g key={i}>
                  <line
                    x1={chartData.padding.left}
                    y1={line.y}
                    x2={chartData.padding.left + chartData.innerWidth}
                    y2={line.y}
                    stroke="currentColor"
                    className="text-gray-200 dark:text-gray-700"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={chartData.padding.left - 10}
                    y={line.y}
                    textAnchor="end"
                    alignmentBaseline="middle"
                    className="text-xs fill-gray-500 dark:fill-gray-400"
                  >
                    {line.value.toLocaleString()}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* Area fill */}
          {showArea && (
            <path
              d={chartData.areaD}
              fill={`url(#${gradientId})`}
              className="transition-all duration-500"
            />
          )}

          {/* Line */}
          <path
            d={chartData.pathD}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-500"
          />

          {/* Data points */}
          {showDots &&
            chartData.points.map((point, index) => (
              <g key={index} className="group">
                {/* Hover ring */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="12"
                  fill="transparent"
                  className="cursor-pointer"
                />
                {/* Dot */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                  className="transition-all duration-200 group-hover:r-6"
                />
                <title>
                  {point.label || point.date}: {point.value.toLocaleString()}
                </title>
              </g>
            ))}

          {/* X-axis labels */}
          {data.length <= 12 && (
            <g>
              {chartData.points.map((point, index) => (
                <text
                  key={index}
                  x={point.x}
                  y={chartData.chartHeight - 10}
                  textAnchor="middle"
                  className="text-xs fill-gray-500 dark:fill-gray-400"
                >
                  {new Date(point.date).toLocaleDateString('en-US', {
                    month: 'short',
                    year: '2-digit',
                  })}
                </text>
              ))}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

// Mini sparkline version for compact displays
export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 100,
  height = 32,
  color = '#0891b2',
  className = '',
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const padding = 2;
    const stepX = (width - padding * 2) / (data.length - 1 || 1);

    const points = data.map((value, index) => ({
      x: padding + index * stepX,
      y: padding + (height - padding * 2) - ((value - min) / range) * (height - padding * 2),
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

    return { points, pathD };
  }, [data, width, height]);

  if (!chartData) return null;

  return (
    <svg width={width} height={height} className={className}>
      <path
        d={chartData.pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {chartData.points.length > 0 && (
        <circle
          cx={chartData.points[chartData.points.length - 1].x}
          cy={chartData.points[chartData.points.length - 1].y}
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
};
