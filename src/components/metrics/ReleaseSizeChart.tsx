import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SessionWorkItemSummary } from '../../utils/metricsUtils';

interface ReleaseSizeChartProps {
  summaries: SessionWorkItemSummary[];
  avgPerSession: number;
  isDarkTheme: boolean;
}

export const ReleaseSizeChart: React.FC<ReleaseSizeChartProps> = ({ summaries, avgPerSession, isDarkTheme }) => {
  const gridColor = isDarkTheme ? '#333' : '#e0e0e0';
  const tooltipBg = isDarkTheme ? '#1e1e1e' : '#fff';
  const tooltipBorder = isDarkTheme ? '#444' : '#ccc';

  if (summaries.length === 0 || summaries.every(s => s.total === 0)) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Release Size</h3>
        <p className="chart-description">Work items per release session</p>
        <div className="chart-empty">
          No work item data available. Work items are captured when approvals are recorded during a release session.
        </div>
      </div>
    );
  }

  // Truncate long session names for x-axis
  const data = summaries.map(s => ({
    name: s.sessionName.length > 16 ? s.sessionName.substring(0, 14) + '...' : s.sessionName,
    fullName: s.sessionName,
    total: s.total,
    date: s.sessionDate,
  }));

  return (
    <div className="chart-container">
      <h3 className="chart-title">Release Size</h3>
      <p className="chart-description">
        Work items per session &middot; Avg: {avgPerSession.toFixed(1)} items
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }}
            formatter={(value: any) => [Number(value), 'Work Items']}
            labelFormatter={(label: any, payload: any) => {
              if (payload && payload.length > 0 && payload[0].payload) {
                return payload[0].payload.fullName + ' (' + payload[0].payload.date + ')';
              }
              return String(label);
            }}
          />
          <Bar dataKey="total" fill="#0078d4" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
