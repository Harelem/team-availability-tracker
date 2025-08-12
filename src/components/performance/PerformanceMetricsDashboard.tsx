'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  Database, 
  Clock, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  MemoryStick,
  BarChart3
} from 'lucide-react'

interface PerformanceMetrics {
  optimization: {
    originalQueryCount: number
    optimizedQueryCount: number
    cacheHitRate: number
    performanceImprovement: number
    memoryUsage: number
  }
  enhancedDb: {
    totalQueries: number
    averageQueryTime: number
    cacheHitRate: number
    slowQueries: any[]
    performanceStats: {
      errorRate: number
      slowQueryCount: number
      peakMemoryUsage: number
      queriesPerSecond: number
    }
  }
  dataService: {
    totalQueries: number
    averageResponseTime: number
    cacheHitRate: number
    slowQueries: any[]
  }
}

interface PerformanceDashboardProps {
  className?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

const PerformanceMetricsDashboard: React.FC<PerformanceDashboardProps> = ({
  className = '',
  autoRefresh = false,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Access the performance optimization service from window global
      if (typeof window !== 'undefined' && (window as any).performanceOptimization) {
        const performanceMetrics = (window as any).performanceOptimization.getMetrics()
        setMetrics(performanceMetrics)
        setLastUpdated(new Date())
      } else {
        // Fallback to individual service metrics if available
        const fallbackMetrics: PerformanceMetrics = {
          optimization: {
            originalQueryCount: 0,
            optimizedQueryCount: 0,
            cacheHitRate: 0,
            performanceImprovement: 0,
            memoryUsage: 0
          },
          enhancedDb: {
            totalQueries: 0,
            averageQueryTime: 0,
            cacheHitRate: 0,
            slowQueries: [],
            performanceStats: {
              errorRate: 0,
              slowQueryCount: 0,
              peakMemoryUsage: 0,
              queriesPerSecond: 0
            }
          },
          dataService: {
            totalQueries: 0,
            averageResponseTime: 0,
            cacheHitRate: 0,
            slowQueries: []
          }
        }
        
        // Try to get individual service metrics
        if ((window as any).dbPerformance) {
          const dbMetrics = (window as any).dbPerformance.getMetrics()
          fallbackMetrics.enhancedDb = {
            ...fallbackMetrics.enhancedDb,
            ...dbMetrics
          }
        }
        
        if ((window as any).dataServiceDebug) {
          const dataMetrics = (window as any).dataServiceDebug.getMetrics()
          fallbackMetrics.dataService = {
            ...fallbackMetrics.dataService,
            ...dataMetrics
          }
        }
        
        setMetrics(fallbackMetrics)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch performance metrics')
      console.error('Performance metrics fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const getStatusColor = (value: number, thresholds: { good: number; fair: number }) => {
    if (value >= thresholds.good) return 'text-green-600 bg-green-50'
    if (value >= thresholds.fair) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getStatusIcon = (value: number, thresholds: { good: number; fair: number }) => {
    if (value >= thresholds.good) return <CheckCircle className="w-4 h-4 text-green-600" />
    if (value >= thresholds.fair) return <AlertTriangle className="w-4 h-4 text-yellow-600" />
    return <AlertTriangle className="w-4 h-4 text-red-600" />
  }

  const handleRefresh = () => {
    fetchMetrics()
  }

  const handleOptimize = () => {
    if (typeof window !== 'undefined') {
      // Trigger cache optimization
      if ((window as any).performanceOptimization?.warmCache) {
        (window as any).performanceOptimization.warmCache()
      }
      
      if ((window as any).dbPerformance?.optimizeCache) {
        (window as any).dbPerformance.optimizeCache()
      }
      
      if ((window as any).dataServiceDebug?.optimizeCache) {
        (window as any).dataServiceDebug.optimizeCache()
      }
      
      // Refresh metrics after optimization
      setTimeout(fetchMetrics, 1000)
    }
  }

  if (loading && !metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading performance metrics...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Performance Metrics Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
          <Button onClick={handleRefresh} variant="outline" className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) return null

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Performance Metrics
            </CardTitle>
            <CardDescription>
              Database and caching performance monitoring
              <span className="block text-xs text-muted-foreground mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleOptimize} variant="outline" size="sm">
              <Zap className="w-4 h-4 mr-2" />
              Optimize
            </Button>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="caching">Caching</TabsTrigger>
            <TabsTrigger value="queries">Queries</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Overall Performance Score */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Performance Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {Math.round(
                          (metrics.enhancedDb.cacheHitRate + 
                           metrics.dataService.cacheHitRate + 
                           metrics.optimization.performanceImprovement) / 3
                        )}%
                      </span>
                      {getStatusIcon(
                        (metrics.enhancedDb.cacheHitRate + metrics.dataService.cacheHitRate) / 2,
                        { good: 80, fair: 60 }
                      )}
                    </div>
                    <Progress 
                      value={Math.round(
                        (metrics.enhancedDb.cacheHitRate + 
                         metrics.dataService.cacheHitRate + 
                         metrics.optimization.performanceImprovement) / 3
                      )} 
                      className="h-2" 
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Average Response Time */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Avg Response Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {Math.round((metrics.enhancedDb.averageQueryTime + metrics.dataService.averageResponseTime) / 2)}ms
                      </span>
                      {getStatusIcon(
                        1000 - (metrics.enhancedDb.averageQueryTime + metrics.dataService.averageResponseTime) / 2,
                        { good: 500, fair: 200 }
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Enhanced DB: {Math.round(metrics.enhancedDb.averageQueryTime)}ms
                      <br />
                      Data Service: {Math.round(metrics.dataService.averageResponseTime)}ms
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Queries */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Total Queries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <span className="text-2xl font-bold">
                      {metrics.enhancedDb.totalQueries + metrics.dataService.totalQueries}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      Enhanced DB: {metrics.enhancedDb.totalQueries}
                      <br />
                      Data Service: {metrics.dataService.totalQueries}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="caching" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Enhanced Database Cache</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Hit Rate</span>
                    <Badge className={getStatusColor(metrics.enhancedDb.cacheHitRate, { good: 80, fair: 60 })}>
                      {metrics.enhancedDb.cacheHitRate.toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress value={metrics.enhancedDb.cacheHitRate} className="h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Data Service Cache</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Hit Rate</span>
                    <Badge className={getStatusColor(metrics.dataService.cacheHitRate, { good: 80, fair: 60 })}>
                      {metrics.dataService.cacheHitRate.toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress value={metrics.dataService.cacheHitRate} className="h-2" />
                </CardContent>
              </Card>
            </div>

            {metrics.optimization.performanceImprovement > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Query Optimization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Performance Improvement</span>
                    <Badge className="text-green-600 bg-green-50">
                      +{metrics.optimization.performanceImprovement.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {metrics.optimization.optimizedQueryCount} optimized queries out of {metrics.optimization.originalQueryCount} total
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="queries" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Enhanced Database Queries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Error Rate</span>
                      <span className="text-xs font-medium">
                        {metrics.enhancedDb.performanceStats.errorRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Slow Queries</span>
                      <span className="text-xs font-medium">
                        {metrics.enhancedDb.performanceStats.slowQueryCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Queries/sec</span>
                      <span className="text-xs font-medium">
                        {metrics.enhancedDb.performanceStats.queriesPerSecond.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Slow Query Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.enhancedDb.slowQueries.length > 0 || metrics.dataService.slowQueries.length > 0 ? (
                    <div className="space-y-2">
                      {[...metrics.enhancedDb.slowQueries, ...metrics.dataService.slowQueries]
                        .slice(0, 3)
                        .map((query, index) => (
                          <div key={index} className="text-xs">
                            <div className="font-medium truncate">{query.queryName}</div>
                            <div className="text-muted-foreground">{Math.round(query.duration)}ms</div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      No slow queries detected
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="memory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <MemoryStick className="w-4 h-4" />
                  Memory Usage Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Peak Memory Usage</span>
                    <Badge variant="outline">
                      {metrics.enhancedDb.performanceStats.peakMemoryUsage}MB
                    </Badge>
                  </div>
                  
                  {metrics.optimization.memoryUsage > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Optimization Layer Memory</span>
                      <Badge variant="outline">
                        {Math.round(metrics.optimization.memoryUsage / 1024)}KB
                      </Badge>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Memory usage is tracked for cache optimization and performance tuning.</p>
                      <p>High memory usage may indicate the need for cache size reduction or data compression.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default PerformanceMetricsDashboard