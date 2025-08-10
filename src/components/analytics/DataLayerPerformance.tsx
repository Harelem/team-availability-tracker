'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  Database, 
  Zap, 
  RefreshCw, 
  TrendingUp, 
  Clock,
  HardDrive,
  Target
} from 'lucide-react'
import { useDataLayerPerformance } from '@/hooks/useOptimizedData'
import { getCacheInfo } from '@/hooks/useDataCache'
import { queryOptimizer } from '@/utils/queryOptimizer'

interface DataLayerPerformanceProps {
  className?: string
}

/**
 * Performance monitoring component for the optimized data layer
 */
export function DataLayerPerformance({ className }: DataLayerPerformanceProps) {
  const { metrics, clearCache } = useDataLayerPerformance()
  const cacheInfo = getCacheInfo()
  const optimizerStats = queryOptimizer.getPerformanceStats()
  const queryTrends = queryOptimizer.getQueryTrends()

  const getPerformanceBadge = (value: number, thresholds: { good: number; ok: number }) => {
    if (value >= thresholds.good) return "default"
    if (value >= thresholds.ok) return "secondary" 
    return "destructive"
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Data Layer Performance</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={clearCache}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Clear Cache
        </Button>
      </div>

      {/* Performance Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(optimizerStats.cacheHitRate * 100).toFixed(1)}%
            </div>
            <div className="mt-2">
              <Badge variant={optimizerStats.cacheHitRate * 100 >= 80 ? "success" : optimizerStats.cacheHitRate * 100 >= 60 ? "primary" : "warning"}>
                {optimizerStats.cacheHitRate * 100 >= 80 ? "Excellent" : 
                 optimizerStats.cacheHitRate * 100 >= 60 ? "Good" : "Needs Improvement"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(optimizerStats.averageResponseTime)}
            </div>
            <div className="mt-2">
              <Badge variant={optimizerStats.averageResponseTime < 500 ? "success" : optimizerStats.averageResponseTime < 1000 ? "primary" : "warning"}>
                {optimizerStats.averageResponseTime < 500 ? "Fast" :
                 optimizerStats.averageResponseTime < 1000 ? "Good" : "Slow"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Size</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cacheInfo.size}
            </div>
            <p className="text-xs text-muted-foreground">
              Cached entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Query Count</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queryTrends.queryCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Last minute
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Query Type Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(optimizerStats.queryTypeBreakdown).map(([type, stats]) => (
                <div key={type} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium capitalize">{type.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground">
                      {stats.count} queries ({formatTime(stats.avgTime)})
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${Math.min(100, (stats.count / Math.max(...Object.values(optimizerStats.queryTypeBreakdown).map(s => s.count))) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
              {Object.keys(optimizerStats.queryTypeBreakdown).length === 0 && (
                <p className="text-sm text-muted-foreground">No query data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Cache Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Entries:</span>
                <span className="font-medium">{cacheInfo.size}</span>
              </div>
              
              <div className="space-y-2">
                <span className="text-sm font-medium">Cached Keys:</span>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {cacheInfo.keys.slice(0, 10).map((key, index) => (
                    <div key={index} className="text-xs text-muted-foreground font-mono bg-gray-50 p-1 rounded">
                      {key}
                    </div>
                  ))}
                  {cacheInfo.keys.length > 10 && (
                    <div className="text-xs text-muted-foreground">
                      ... and {cacheInfo.keys.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Cache Hit Rate Analysis */}
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                optimizerStats.cacheHitRate > 0.8 ? 'bg-green-500' : 
                optimizerStats.cacheHitRate > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <div>
                <h4 className="font-medium text-sm">Cache Efficiency</h4>
                <p className="text-sm text-muted-foreground">
                  {optimizerStats.cacheHitRate > 0.8 
                    ? "Cache is performing excellently with high hit rate"
                    : optimizerStats.cacheHitRate > 0.6
                    ? "Cache performance is good but could be improved"
                    : "Cache needs optimization - consider increasing TTL values"}
                </p>
              </div>
            </div>

            {/* Response Time Analysis */}
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 ${
                optimizerStats.averageResponseTime < 500 ? 'bg-green-500' : 
                optimizerStats.averageResponseTime < 1000 ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <div>
                <h4 className="font-medium text-sm">Response Speed</h4>
                <p className="text-sm text-muted-foreground">
                  {optimizerStats.averageResponseTime < 500
                    ? "Response times are excellent"
                    : optimizerStats.averageResponseTime < 1000
                    ? "Response times are acceptable"
                    : "Response times are slow - consider query optimization"}
                </p>
              </div>
            </div>

            {/* Optimization Suggestions */}
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-2 bg-blue-500" />
              <div>
                <h4 className="font-medium text-sm">Optimization Status</h4>
                <p className="text-sm text-muted-foreground">
                  Data layer optimizations are active. Query batching and caching are reducing database load by an estimated 
                  {((1 - Math.min(1, queryTrends.queryCount / 10)) * 100).toFixed(0)}% compared to individual queries.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DataLayerPerformance