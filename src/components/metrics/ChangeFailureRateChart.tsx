import * as React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TimeBucket, getFailureRateData } from '../../utils/metricsUtils';

interface ChangeFailureRateChartProps {
  buckets: TimeBucket[];
  isDarkTheme: boolean;
}

export const ChangeFailureRateChart: React.FC<ChangeFailureRateChartProps> = ({ buckets, isDarkTheme }) => {
  const data = getFailureRateData(buckets);
  const textColor = isDarkTheme ? '#ccc' : '#333';
  const gridColor = isDarkTheme ? '#444' : '#e0e0e0';

  if (data.length === 0) {
    return <div className="chart-empty">No failure rate data available</div>;
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Change Failure Rate</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 12 }} />
          <YAxis
            unit="%"
            domain={[0, 'auto']}
            tick={{ fill: textColor, fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Failure Rate']}
            contentStyle={{
              backgroundColor: isDarkTheme ? '#2d2d2d' : '#fff',
              border: `1px solid ${gridColor}`,
              color: textColor,
              borderRadius: 4,
            }}
          />
          <Area
            type="monotone"
            dataKey="rate"
            name="Failure Rate"
            stroke="#f44336"
            fill={isDarkTheme ? 'rgba(244,67,54,0.2)' : 'rgba(244,67,54,0.1)'}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
