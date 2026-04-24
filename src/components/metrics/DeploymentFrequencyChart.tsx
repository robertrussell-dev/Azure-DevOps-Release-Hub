import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TimeBucket, getDeploymentFrequencyData } from '../../utils/metricsUtils';

interface DeploymentFrequencyChartProps {
  buckets: TimeBucket[];
  isDarkTheme: boolean;
}

export const DeploymentFrequencyChart: React.FC<DeploymentFrequencyChartProps> = ({ buckets, isDarkTheme }) => {
  const data = getDeploymentFrequencyData(buckets);
  const textColor = isDarkTheme ? '#ccc' : '#333';
  const gridColor = isDarkTheme ? '#444' : '#e0e0e0';

  if (data.length === 0) {
    return <div className="chart-empty">No deployment data available</div>;
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Deployment Frequency</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fill: textColor, fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDarkTheme ? '#2d2d2d' : '#fff',
              border: `1px solid ${gridColor}`,
              color: textColor,
              borderRadius: 4,
            }}
          />
          <Legend />
          <Bar dataKey="deployments" name="Succeeded" fill="#4caf50" radius={[3, 3, 0, 0]} />
          <Bar dataKey="failures" name="Failed" fill="#f44336" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
