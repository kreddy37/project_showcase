'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface ProbabilityData {
  [key: string]: number;
}

interface ProbabilityPieChartProps {
  probability: ProbabilityData;
  title?: string;
  colors?: Record<string, string>;
}

export default function ProbabilityPieChart({ probability, title = 'Shot Outcome Prediction', colors }: ProbabilityPieChartProps) {
  // Transform probability object into array format for Recharts
  const data = Object.entries(probability).map(([name, value]) => ({
    name: formatOutcomeName(name),
    value: Math.round(value * 10000) / 100, // Convert to percentage
    originalName: name,
  }));

  // Define colors for each outcome type
  const outcomeColors: Record<string, string> = {
    'goal': '#22c55e',                      // green
    'play stopped': '#8b5cf6',              // purple
    'play continued in zone': '#3b82f6',    // blue
    'play continued outside zone': '#f59e0b', // amber
    'generated rebound': '#ef4444',         // red
  };

  const getColor = (originalName: string): string => {
    if (colors && colors[originalName]) {
      return colors[originalName];
    }
    return outcomeColors[originalName] || '#64748b'; // Default slate gray
  };

  // Format outcome names for display
  function formatOutcomeName(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Custom label to show percentage on pie slices
  const renderCustomLabel = (entry: any) => {
    return `${entry.value.toFixed(1)}%`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-white">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-gray-300">
            {data.value.toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white/5 border border-white/15 rounded-2xl p-6">
      <h3 className="text-white font-bold text-lg mb-6">{title}</h3>

      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={renderCustomLabel}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
            isAnimationActive={true}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.originalName)} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        {data.map((item, index) => (
          <div
            key={index}
            className="bg-white/5 border border-white/10 rounded-lg p-3"
          >
            <div
              className="w-3 h-3 rounded-full inline-block mr-2"
              style={{ backgroundColor: getColor(item.originalName) }}
            />
            <span className="text-gray-300 text-sm">{item.name}</span>
            <p className="text-white font-semibold text-lg">{item.value.toFixed(2)}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
