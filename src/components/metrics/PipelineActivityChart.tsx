import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ReleaseAction } from '../../types/releaseMode';

interface PipelineActivityChartProps {
  actions: ReleaseAction[];
  isDarkTheme: boolean;
}

export const PipelineActivityChart: React.FC<PipelineActivityChartProps> = ({ actions, isDarkTheme }) => {
  const gridColor = isDarkTheme ? '#333' : '#e0e0e0';
  const tooltipBg = isDarkTheme ? '#1e1e1e' : '#fff';
  const tooltipBorder = isDarkTheme ? '#444' : '#ccc';

  const approvals = actions.filter(a => a.action === 'approve');
  if (approvals.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Pipeline Activity</h3>
        <p className="chart-description">Deployments by pipeline</p>
        <div className="chart-empty">No approval data available.</div>
      </div>
    );
  }

  // Count approvals per pipeline
  const counts = new Map<string, { succeeded: number; failed: number; pending: number }>();
  for (const a of approvals) {
    const name = a.pipelineName || 'Unknown';
    const entry = counts.get(name) || { succeeded: 0, failed: 0, pending: 0 };
    if (a.stageOutcome === 'succeeded') entry.succeeded++;
    else if (a.stageOutcome === 'failed' || a.stageOutcome === 'canceled') entry.failed++;
    else entry.pending++;
    counts.set(name, entry);
  }

  const data = Array.from(counts.entries())
    .map(([name, c]) => ({
      name: name.length > 24 ? name.substring(0, 22) + '...' : name,
      fullName: name,
      succeeded: c.succeeded,
      failed: c.failed,
      total: c.succeeded + c.failed + c.pending,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <div className="chart-container">
      <h3 className="chart-title">Pipeline Activity</h3>
      <p className="chart-description">Top pipelines by deployment count</p>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36 + 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }}
            labelFormatter={(label: any, payload: any) => {
              if (payload && payload.length > 0 && payload[0].payload) {
                return payload[0].payload.fullName;
              }
              return String(label);
            }}
          />
          <Bar dataKey="succeeded" name="Succeeded" stackId="deploy" fill="#4caf50" />
          <Bar dataKey="failed" name="Failed" stackId="deploy" fill="#d13438" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
