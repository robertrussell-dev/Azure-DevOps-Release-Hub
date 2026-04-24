import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SessionWorkItemSummary } from '../../utils/metricsUtils';

interface ApprovalVelocityChartProps {
  summaries: SessionWorkItemSummary[];
  sessionApprovalCounts: Array<{ sessionName: string; date: string; approvals: number; rejections: number }>;
  isDarkTheme: boolean;
}

export const ApprovalVelocityChart: React.FC<ApprovalVelocityChartProps> = ({ sessionApprovalCounts, isDarkTheme }) => {
  const gridColor = isDarkTheme ? '#333' : '#e0e0e0';
  const tooltipBg = isDarkTheme ? '#1e1e1e' : '#fff';
  const tooltipBorder = isDarkTheme ? '#444' : '#ccc';

  if (sessionApprovalCounts.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Session Throughput</h3>
        <p className="chart-description">Approvals and rejections per release session</p>
        <div className="chart-empty">No session data available.</div>
      </div>
    );
  }

  const data = sessionApprovalCounts.map(s => ({
    name: s.sessionName.length > 16 ? s.sessionName.substring(0, 14) + '...' : s.sessionName,
    fullName: s.sessionName,
    date: s.date,
    approvals: s.approvals,
    rejections: s.rejections,
  }));

  return (
    <div className="chart-container">
      <h3 className="chart-title">Session Throughput</h3>
      <p className="chart-description">Approvals and rejections per release session</p>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }}
            labelFormatter={(label: any, payload: any) => {
              if (payload && payload.length > 0 && payload[0].payload) {
                return payload[0].payload.fullName + ' (' + payload[0].payload.date + ')';
              }
              return String(label);
            }}
          />
          <Bar dataKey="approvals" name="Approvals" fill="#4caf50" radius={[4, 4, 0, 0]} />
          <Bar dataKey="rejections" name="Rejections" fill="#d13438" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
