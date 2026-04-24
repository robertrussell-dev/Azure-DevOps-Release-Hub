import * as React from 'react';
import { DORALevel, getDORAColor, getDORALabel } from '../../utils/metricsUtils';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  level: DORALevel | null;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, level }) => {
  const borderColor = getDORAColor(level);
  const levelLabel = getDORALabel(level);

  return (
    <div className="metric-card" style={{ borderTopColor: borderColor }}>
      <div className="metric-card-header">
        <span className="metric-card-title">{title}</span>
        {level && (
          <span className="metric-card-level" style={{ backgroundColor: borderColor }}>
            {levelLabel}
          </span>
        )}
      </div>
      <div className="metric-card-value">{value}</div>
      {subtitle && <div className="metric-card-subtitle">{subtitle}</div>}
    </div>
  );
};
