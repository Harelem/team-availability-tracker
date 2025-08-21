'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock,
  Target,
  Lightbulb,
  X,
  ChevronRight,
  Bell,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

interface Insight {
  id: string;
  type: 'alert' | 'trend' | 'recommendation' | 'achievement';
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  description: string;
  metric?: string;
  value?: number | string;
  change?: number;
  actionable: boolean;
  timestamp: Date;
  teamId?: string;
  teamName?: string;
  category: 'capacity' | 'performance' | 'quality' | 'team-health';
}

interface Action {
  id: string;
  label: string;
  type: 'primary' | 'secondary';
  onClick: () => void;
}

interface RealTimeInsightsProps {
  insights: Insight[];
  onDismiss?: (insightId: string) => void;
  onAction?: (insightId: string, actionId: string) => void;
  maxVisible?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

export function RealTimeInsights({
  insights,
  onDismiss,
  onAction,
  maxVisible = 5,
  autoRefresh = true,
  refreshInterval = 30000,
  className = ''
}: RealTimeInsightsProps) {
  const [visibleInsights, setVisibleInsights] = useState<Insight[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const filtered = insights
      .filter(insight => !dismissedIds.has(insight.id))
      .sort((a, b) => {
        // Sort by severity first, then by timestamp
        const severityOrder = { error: 0, warning: 1, success: 2, info: 3 };
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.timestamp.getTime() - a.timestamp.getTime();
      })
      .slice(0, maxVisible);
    
    setVisibleInsights(filtered);
  }, [insights, dismissedIds, maxVisible]);

  const handleDismiss = (insightId: string) => {
    setDismissedIds(prev => new Set([...prev, insightId]));
    onDismiss?.(insightId);
  };

  const getInsightIcon = (insight: Insight) => {
    switch (insight.type) {
      case 'alert':
        return insight.severity === 'error' 
          ? <AlertTriangle className="h-5 w-5" />
          : <AlertCircle className="h-5 w-5" />;
      case 'trend':
        return insight.change && insight.change > 0 
          ? <TrendingUp className="h-5 w-5" />
          : <TrendingDown className="h-5 w-5" />;
      case 'recommendation':
        return <Lightbulb className="h-5 w-5" />;
      case 'achievement':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getInsightColors = (severity: Insight['severity']) => {
    switch (severity) {
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'text-red-600'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: 'text-yellow-600'
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: 'text-green-600'
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-600'
        };
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return timestamp.toLocaleDateString();
  };

  if (visibleInsights.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="text-center">
          <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">All caught up!</h3>
          <p className="text-sm text-gray-600">No new insights or alerts at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Real-time Insights</h3>
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Live
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {visibleInsights.map((insight) => {
          const colors = getInsightColors(insight.severity);
          const Icon = getInsightIcon(insight);
          
          return (
            <div key={insight.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 ${colors.icon}`}>
                  {Icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {insight.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {insight.description}
                      </p>
                      
                      {insight.metric && insight.value && (
                        <div className="flex items-center mt-2 space-x-4">
                          <div className="text-sm">
                            <span className="text-gray-600">{insight.metric}:</span>
                            <span className="font-medium text-gray-900 ml-1">
                              {insight.value}
                            </span>
                          </div>
                          {insight.change && (
                            <div className={`text-sm flex items-center ${
                              insight.change > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {insight.change > 0 ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 mr-1" />
                              )}
                              {Math.abs(insight.change)}%
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimestamp(insight.timestamp)}</span>
                          {insight.teamName && (
                            <>
                              <span>•</span>
                              <span>{insight.teamName}</span>
                            </>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                            {insight.category.replace('-', ' ')}
                          </span>
                        </div>
                        
                        {insight.actionable && (
                          <button className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center">
                            Take action
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {onDismiss && (
                      <button
                        onClick={() => handleDismiss(insight.id)}
                        className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {insights.length > maxVisible && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {insights.length - maxVisible} more insights available
            </p>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-1">
              View all insights
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Insight generation utilities
export class InsightGenerator {
  static generateCapacityAlert(teamId: string, teamName: string, utilization: number): Insight {
    return {
      id: `capacity-${teamId}-${Date.now()}`,
      type: 'alert',
      severity: utilization > 100 ? 'error' : 'warning',
      title: utilization > 100 ? 'Team Over Capacity' : 'High Capacity Utilization',
      description: `${teamName} is operating at ${utilization.toFixed(1)}% capacity. Consider redistributing workload or adjusting sprint scope.`,
      metric: 'Current Utilization',
      value: `${utilization.toFixed(1)}%`,
      actionable: true,
      timestamp: new Date(),
      teamId,
      teamName,
      category: 'capacity'
    };
  }

  static generateVelocityTrend(teamId: string, teamName: string, velocity: number, previousVelocity: number): Insight {
    const change = ((velocity - previousVelocity) / previousVelocity) * 100;
    const isPositive = change > 0;
    
    return {
      id: `velocity-${teamId}-${Date.now()}`,
      type: 'trend',
      severity: isPositive ? 'success' : change < -20 ? 'warning' : 'info',
      title: isPositive ? 'Velocity Improvement' : 'Velocity Decline',
      description: `${teamName}'s velocity has ${isPositive ? 'increased' : 'decreased'} compared to the previous sprint.`,
      metric: 'Current Velocity',
      value: `${velocity} SP`,
      change: Math.round(change),
      actionable: !isPositive && Math.abs(change) > 15,
      timestamp: new Date(),
      teamId,
      teamName,
      category: 'performance'
    };
  }

  static generateBurnoutRisk(teamId: string, teamName: string, riskScore: number): Insight {
    const severity = riskScore > 0.7 ? 'error' : riskScore > 0.4 ? 'warning' : 'info';
    
    return {
      id: `burnout-${teamId}-${Date.now()}`,
      type: 'alert',
      severity,
      title: 'Burnout Risk Assessment',
      description: `${teamName} shows ${riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'moderate' : 'low'} burnout risk indicators. Consider workload adjustments.`,
      metric: 'Risk Score',
      value: `${(riskScore * 100).toFixed(0)}%`,
      actionable: riskScore > 0.4,
      timestamp: new Date(),
      teamId,
      teamName,
      category: 'team-health'
    };
  }

  static generateAchievement(teamId: string, teamName: string, metric: string, value: string): Insight {
    return {
      id: `achievement-${teamId}-${Date.now()}`,
      type: 'achievement',
      severity: 'success',
      title: 'Goal Achievement',
      description: `${teamName} has successfully achieved their ${metric.toLowerCase()} target!`,
      metric,
      value,
      actionable: false,
      timestamp: new Date(),
      teamId,
      teamName,
      category: 'performance'
    };
  }
}

export default RealTimeInsights;