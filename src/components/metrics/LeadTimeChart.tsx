import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TimeBucket, getLeadTimeData, formatDuration } from '../../utils/metricsUtils';

interface LeadTimeChartProps {
  buckets: TimeBucket[];
  isDarkTheme: boolean;
}

export const LeadTimeChart: React.FC<LeadTimeChartProps> = ({ buckets, isDarkTheme }) => {
  const data = getLeadTimeData(buckets).map(d => ({
    ...d,
    avgMinutes: d.avgMinutes !== null ? Math.round(d.avgMinutes) : 0,
  }));
  const textColor = isDarkTheme ? '#ccc' : '#333';
  const gridColor = isDarkTheme ? '#444' : '#e0e0e0';

  const hasData = data.some(d => d.count > 0);

  if (!hasData) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Lead Time for Changes</h3>
        <div className="chart-empty">
          No lead time data yet. This metric requires approvals recorded with v2.0.19+ which captures approval creation timestamps.
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Lead Time for Changes</h3>
      <p className="chart-description">Time from approval creation to approval action (approval wait time)</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 12 }} />
          <YAxis
            tick={{ fill: textColor, fontSize: 12 }}
            tickFormatter={(v: number) => formatDuration(v)}
          />
          <Tooltip
            formatter={(value: any) => [formatDuration(Number(value)), 'Avg Lead Time']}
            contentStyle={{
              backgroundColor: isDarkTheme ? '#2d2d2d' : '#fff',
              border: `1px solid ${gridColor}`,
              color: textColor,
              borderRadius: 4,
            }}
          />
          <Bar dataKey="avgMinutes" name="Avg Lead Time" fill="#2196f3" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
