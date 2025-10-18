import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PortfolioChartProps {
  data?: Array<{
    timestamp: string;
    value: number;
  }>;
  currentValue: number;
  change: number;
  changePercent: number;
}

const PortfolioChart: React.FC<PortfolioChartProps> = ({ 
  data = [], 
  currentValue, 
  change, 
  changePercent 
}) => {
  // Mock data for demonstration
  const mockData = [
    { timestamp: '00:00', value: 1000 },
    { timestamp: '04:00', value: 1050 },
    { timestamp: '08:00', value: 1100 },
    { timestamp: '12:00', value: 1200 },
    { timestamp: '16:00', value: 1150 },
    { timestamp: '20:00', value: currentValue },
  ];

  const chartData = data.length > 0 ? data : mockData;
  const isPositive = change >= 0;
  const maxValue = Math.max(...chartData.map(d => d.value));
  const minValue = Math.min(...chartData.map(d => d.value));
  const range = maxValue - minValue;

  return (
    <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-orange-200/50 dark:border-orange-800/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Portfolio Value
          <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{changePercent.toFixed(2)}%</span>
          </div>
        </CardTitle>
        <CardDescription>
          Last 24 hours performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              ${currentValue.toFixed(2)}
            </span>
            <span className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}${change.toFixed(2)}
            </span>
          </div>
          
          {/* Simple Line Chart */}
          <div className="h-32 relative">
            <svg className="w-full h-full" viewBox="0 0 400 120">
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0.3"/>
                  <stop offset="100%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0"/>
                </linearGradient>
              </defs>
              
              {/* Area under curve */}
              <path
                d={`M 0 ${120 - ((chartData[0].value - minValue) / range) * 100} ${chartData.map((point, index) => 
                  `L ${(index / (chartData.length - 1)) * 400} ${120 - ((point.value - minValue) / range) * 100}`
                ).join(' ')} L 400 120 L 0 120 Z`}
                fill="url(#gradient)"
              />
              
              {/* Line */}
              <path
                d={`M ${chartData.map((point, index) => 
                  `${(index / (chartData.length - 1)) * 400},${120 - ((point.value - minValue) / range) * 100}`
                ).join(' L ')}`}
                stroke={isPositive ? '#10b981' : '#ef4444'}
                strokeWidth="2"
                fill="none"
              />
              
              {/* Data points */}
              {chartData.map((point, index) => (
                <circle
                  key={index}
                  cx={(index / (chartData.length - 1)) * 400}
                  cy={120 - ((point.value - minValue) / range) * 100}
                  r="3"
                  fill={isPositive ? '#10b981' : '#ef4444'}
                />
              ))}
            </svg>
          </div>
          
          {/* Time labels */}
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            {chartData.map((point, index) => (
              <span key={index}>{point.timestamp}</span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioChart;



