'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendPercentage?: number;
  status?: 'good' | 'warning' | 'critical' | 'neutral';
  description?: string;
  target?: number;
  className?: string;
}

export function PerformanceMetricsCard({
  title,
  value,
  previousValue,
  unit = '',
  trend,
  trendPercentage,
  status = 'neutral',
  description,
  target,
  className = ''
}: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />;
      case 'down':
        return <TrendingDown className="h-4 w-4" />;
      case 'stable':
        return <Minus className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return status === 'good' ? 'text-green-600' : 'text-red-600';
      case 'down':
        return status === 'good' ? 'text-red-600' : 'text-green-600';
      case 'stable':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'critical':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  const progressPercentage = target ? Math.min((Number(value) / target) * 100, 100) : 0;

  return (
    <div className={`rounded-lg border p-6 ${getStatusColor()} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
            {getStatusIcon()}
          </div>
          
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold text-gray-900">
              {formatValue(value)}
            </span>
            {unit && (
              <span className="text-sm text-gray-600">{unit}</span>
            )}
          </div>

          {trend && trendPercentage !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>
                {Math.abs(trendPercentage)}% vs previous period
              </span>
            </div>
          )}

          {description && (
            <p className="text-xs text-gray-600 mt-2">{description}</p>
          )}

          {target && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Progress to Target</span>
                <span>{target.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    progressPercentage >= 100
                      ? 'bg-green-500'
                      : progressPercentage >= 75
                      ? 'bg-blue-500'
                      : progressPercentage >= 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {progressPercentage.toFixed(1)}% of target achieved
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MetricsGridProps {
  metrics: MetricCardProps[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function PerformanceMetricsGrid({ 
  metrics, 
  columns = 3, 
  className = '' 
}: MetricsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {metrics.map((metric, index) => (
        <PerformanceMetricsCard key={index} {...metric} />
      ))}
    </div>
  );
}

// Pre-configured metric card types
export function VelocityMetricCard({ velocity, previousVelocity, target }: {
  velocity: number;
  previousVelocity?: number;
  target?: number;
}) {
  const trend = previousVelocity 
    ? velocity > previousVelocity ? 'up' : velocity < previousVelocity ? 'down' : 'stable'
    : undefined;
  
  const trendPercentage = previousVelocity 
    ? ((velocity - previousVelocity) / previousVelocity) * 100
    : undefined;

  return (
    <PerformanceMetricsCard
      title="Team Velocity"
      value={velocity}
      unit="story points"
      trend={trend}
      trendPercentage={trendPercentage}
      status={velocity >= (target || velocity) ? 'good' : 'warning'}
      description="Average story points completed per sprint"
      target={target}
    />
  );
}

export function UtilizationMetricCard({ utilization, target = 85 }: {
  utilization: number;
  target?: number;
}) {
  const status = utilization >= target ? 'good' : utilization >= target * 0.8 ? 'warning' : 'critical';

  return (
    <PerformanceMetricsCard
      title="Team Utilization"
      value={utilization.toFixed(1)}
      unit="%"
      status={status}
      description="Percentage of available capacity utilized"
      target={target}
    />
  );
}

export function BurnoutRiskMetricCard({ riskScore }: { riskScore: number }) {
  const status = riskScore < 0.3 ? 'good' : riskScore < 0.7 ? 'warning' : 'critical';
  const riskLevel = riskScore < 0.3 ? 'Low' : riskScore < 0.7 ? 'Medium' : 'High';

  return (
    <PerformanceMetricsCard
      title="Burnout Risk"
      value={riskLevel}
      status={status}
      description={`Risk score: ${(riskScore * 100).toFixed(1)}%`}
    />
  );
}

export default PerformanceMetricsCard;