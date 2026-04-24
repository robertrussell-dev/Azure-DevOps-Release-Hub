import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SessionWorkItemSummary } from '../../utils/metricsUtils';

interface WorkItemBreakdownChartProps {
  summaries: SessionWorkItemSummary[];
  isDarkTheme: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  bugs: '#d13438',
  features: '#0078d4',
  stories: '#4caf50',
  epics: '#9c27b0',
  tasks: '#ff9800',
  other: '#607d8b',
};

const TYPE_LABELS: Record<string, string> = {
  bugs: 'Bugs',
  features: 'Features',
  stories: 'User Stories',
  epics: 'Epics',
  tasks: 'Tasks',
  other: 'Other',
};

export const WorkItemBreakdownChart: React.FC<WorkItemBreakdownChartProps> = ({ summaries, isDarkTheme }) => {
  const gridColor = isDarkTheme ? '#333' : '#e0e0e0';
  const tooltipBg = isDarkTheme ? '#1e1e1e' : '#fff';
  const tooltipBorder = isDarkTheme ? '#444' : '#ccc';

  if (summaries.length === 0 || summaries.every(s => s.total === 0)) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Work Item Breakdown</h3>
        <p className="chart-description">Items by type per release session</p>
        <div className="chart-empty">
          No work item data available. Work items are captured when approvals are recorded during a release session.
        </div>
      </div>
    );
  }

  const data = summaries.map(s => ({
    name: s.sessionName.length > 16 ? s.sessionName.substring(0, 14) + '...' : s.sessionName,
    fullName: s.sessionName,
    date: s.sessionDate,
    bugs: s.bugs,
    features: s.features,
    stories: s.stories,
    epics: s.epics,
    tasks: s.tasks,
    other: s.other,
  }));

  // Only show bar layers for types that have data
  const activeTypes = Object.keys(TYPE_COLORS).filter(
    type => summaries.some(s => (s as any)[type] > 0)
  );

  return (
    <div className="chart-container">
      <h3 className="chart-title">Work Item Breakdown</h3>
      <p className="chart-description">Items by type per release session</p>
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
          <Legend />
          {activeTypes.map(type => (
            <Bar
              key={type}
              dataKey={type}
              name={TYPE_LABELS[type]}
              stackId="items"
              fill={TYPE_COLORS[type]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
