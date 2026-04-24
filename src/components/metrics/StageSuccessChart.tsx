import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ReleaseAction } from '../../types/releaseMode';

interface StageSuccessChartProps {
  actions: ReleaseAction[];
  isDarkTheme: boolean;
}

export const StageSuccessChart: React.FC<StageSuccessChartProps> = ({ actions, isDarkTheme }) => {
  const gridColor = isDarkTheme ? '#333' : '#e0e0e0';
  const tooltipBg = isDarkTheme ? '#1e1e1e' : '#fff';
  const tooltipBorder = isDarkTheme ? '#444' : '#ccc';

  const withOutcomes = actions.filter(a => a.action === 'approve' && a.stageOutcome && a.stageOutcome !== 'pending');
  if (withOutcomes.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Stage Success Rate</h3>
        <p className="chart-description">Success vs. failure by deployment stage</p>
        <div className="chart-empty">No completed stage data available yet.</div>
      </div>
    );
  }

  // Count outcomes per stage
  const counts = new Map<string, { succeeded: number; failed: number }>();
  for (const a of withOutcomes) {
    const stage = a.stageName || 'Unknown';
    const entry = counts.get(stage) || { succeeded: 0, failed: 0 };
    if (a.stageOutcome === 'succeeded') entry.succeeded++;
    else entry.failed++;
    counts.set(stage, entry);
  }

  const data = Array.from(counts.entries())
    .map(([stage, c]) => {
      const total = c.succeeded + c.failed;
      return {
        name: stage.length > 24 ? stage.substring(0, 22) + '...' : stage,
        fullName: stage,
        succeeded: c.succeeded,
        failed: c.failed,
        rate: total > 0 ? Math.round((c.succeeded / total) * 100) : 0,
      };
    })
    .sort((a, b) => (b.succeeded + b.failed) - (a.succeeded + a.failed))
    .slice(0, 10);

  return (
    <div className="chart-container">
      <h3 className="chart-title">Stage Success Rate</h3>
      <p className="chart-description">Success vs. failure by deployment stage</p>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36 + 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }}
            labelFormatter={(label: any, payload: any) => {
              if (payload && payload.length > 0 && payload[0].payload) {
                const p = payload[0].payload;
                return `${p.fullName} (${p.rate}% success)`;
              }
              return String(label);
            }}
          />
          <Bar dataKey="succeeded" name="Succeeded" stackId="outcome" fill="#4caf50" />
          <Bar dataKey="failed" name="Failed" stackId="outcome" fill="#d13438" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
