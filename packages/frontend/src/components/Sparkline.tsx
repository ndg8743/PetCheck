import React from 'react';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * Tiny inline-SVG sparkline. Single series, no axes, no chart library.
 * Used for Pet weight history (Feature G) and adverse-event monthly counts
 * (Feature H). Returns null when there's nothing to plot.
 */
export const Sparkline: React.FC<SparklineProps> = ({
  values,
  width = 240,
  height = 60,
  stroke = 'currentColor',
  fill = 'currentColor',
  strokeWidth = 1.5,
  className = '',
  ariaLabel,
}) => {
  if (!values || values.length === 0) return null;
  if (values.length === 1) {
    // Render a single point as a small dot.
    return (
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} aria-label={ariaLabel}>
        <circle cx={width / 2} cy={height / 2} r={3} fill={stroke} />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const xStep = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * xStep;
    // Pad 2px top/bottom so the line/dot doesn't touch the edge.
    const y = height - 2 - ((v - min) / range) * (height - 4);
    return [x, y] as const;
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${(points[points.length - 1][0]).toFixed(1)},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <path d={areaPath} fill={fill} fillOpacity={0.12} stroke="none" />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {/* Mark the latest point */}
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r={3}
        fill={stroke}
      />
    </svg>
  );
};
