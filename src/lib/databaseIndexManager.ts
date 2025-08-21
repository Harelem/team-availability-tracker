/**
 * Database Index Management and Monitoring Utilities
 * Provides tools for managing performance indexes and monitoring their effectiveness
 */

import { supabase } from './supabase'

interface IndexStats {
  schemaname: string
  tablename: string
  indexname: string
  idx_tup_read: number
  idx_tup_fetch: number
  idx_scan: number
  size: string
  isUsed: boolean
}

interface TableStats {
  schemaname: string
  tablename: string
  total_writes: number
  seq_scan: number
  seq_tup_read: number
  idx_scan: number
  idx_tup_fetch: number
  size: string
}

interface QueryPerformance {
  query: string
  mean_time: number
  calls: number
  total_time: number
  rows_per_call: number
}

export class DatabaseIndexManager {
  private isEnabled: boolean

  constructor() {
    // Only enable in development or when explicitly configured
    this.isEnabled = process.env.NODE_ENV === 'development' || 
                     process.env.ENABLE_DB_MONITORING === 'true'
  }

  /**
   * Get index usage statistics for monitoring performance
   */
  async getIndexStats(): Promise<IndexStats[]> {
    if (!this.isEnabled) {
      console.warn('Database index monitoring is disabled')
      return []
    }

    try {
      const { data, error } = await supabase.rpc('get_index_stats')
      
      if (error) {
        console.error('Error getting index stats:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to get index statistics:', error)
      return []
    }
  }

  /**
   * Get table statistics for performance analysis
   */
  async getTableStats(): Promise<TableStats[]> {
    if (!this.isEnabled) {
      console.warn('Database table monitoring is disabled')
      return []
    }

    try {
      const { data, error } = await supabase.rpc('get_table_stats')
      
      if (error) {
        console.error('Error getting table stats:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to get table statistics:', error)
      return []
    }
  }

  /**
   * Identify unused indexes that could be dropped
   */
  async findUnusedIndexes(): Promise<IndexStats[]> {
    const allIndexes = await this.getIndexStats()
    return allIndexes.filter(index => 
      index.idx_scan === 0 && 
      !index.indexname.includes('_pkey') && // Don't flag primary keys
      !index.indexname.includes('_fkey')    // Don't flag foreign keys
    )
  }

  /**
   * Get slow queries that might benefit from indexing
   */
  async getSlowQueries(): Promise<QueryPerformance[]> {
    if (!this.isEnabled) {
      console.warn('Query performance monitoring is disabled')
      return []
    }

    try {
      const { data, error } = await supabase.rpc('get_slow_queries')
      
      if (error) {
        console.error('Error getting slow queries:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to get slow query statistics:', error)
      return []
    }
  }

  /**
   * Analyze index effectiveness and provide recommendations
   */
  async analyzeIndexEffectiveness(): Promise<{
    recommendations: string[]
    unusedIndexes: IndexStats[]
    heavyTables: TableStats[]
    slowQueries: QueryPerformance[]
  }> {
    const recommendations: string[] = []
    const unusedIndexes = await this.findUnusedIndexes()
    const tableStats = await this.getTableStats()
    const slowQueries = await getSlowQueries()

    // Analyze unused indexes
    if (unusedIndexes.length > 0) {
      recommendations.push(
        `Found ${unusedIndexes.length} unused indexes that could be dropped to improve write performance`
      )
    }

    // Analyze tables with high sequential scan ratios
    const heavyTables = tableStats.filter(table => {
      const totalScans = table.seq_scan + table.idx_scan
      const seqScanRatio = totalScans > 0 ? table.seq_scan / totalScans : 0
      return seqScanRatio > 0.3 && table.seq_tup_read > 1000
    })

    if (heavyTables.length > 0) {
      recommendations.push(
        `Found ${heavyTables.length} tables with high sequential scan ratios that might benefit from additional indexes`
      )
    }

    // Analyze slow queries
    const criticalSlowQueries = slowQueries.filter(query => 
      query.mean_time > 100 && query.calls > 10
    )

    if (criticalSlowQueries.length > 0) {
      recommendations.push(
        `Found ${criticalSlowQueries.length} frequently called slow queries that need optimization`
      )
    }

    return {
      recommendations,
      unusedIndexes,
      heavyTables,
      slowQueries: criticalSlowQueries
    }
  }

  /**
   * Generate index creation SQL for missing indexes
   */
  generateRecommendedIndexes(tableStats: TableStats[]): string[] {
    const indexSql: string[] = []

    tableStats.forEach(table => {
      switch (table.tablename) {
        case 'schedule_entries':
          if (table.seq_scan > table.idx_scan) {
            indexSql.push(`
              -- Recommended index for ${table.tablename}
              CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_${table.tablename}_performance_boost
              ON ${table.tablename} (date, member_id) 
              INCLUDE (value, reason)
              WHERE date >= CURRENT_DATE - INTERVAL '90 days';
            `)
          }
          break
        
        case 'team_members':
          if (table.seq_scan > table.idx_scan) {
            indexSql.push(`
              -- Recommended index for ${table.tablename}
              CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_${table.tablename}_active_lookup
              ON ${table.tablename} (team_id, inactive_date) 
              INCLUDE (name, hebrew, is_manager)
              WHERE inactive_date IS NULL;
            `)
          }
          break
      }
    })

    return indexSql
  }

  /**
   * Update table statistics for better query planning
   */
  async updateTableStatistics(): Promise<void> {
    if (!this.isEnabled) {
      console.warn('Database statistics update is disabled')
      return
    }

    try {
      const tables = ['schedule_entries', 'team_members', 'teams', 'global_sprint_settings']
      
      for (const table of tables) {
        await supabase.rpc('analyze_table', { table_name: table })
        console.log(`✅ Updated statistics for table: ${table}`)
      }
      
      console.log('📊 Database statistics update completed')
    } catch (error) {
      console.error('Failed to update table statistics:', error)
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(): Promise<string> {
    if (!this.isEnabled) {
      return 'Database monitoring is disabled'
    }

    try {
      const analysis = await this.analyzeIndexEffectiveness()
      const indexStats = await this.getIndexStats()
      const tableStats = await this.getTableStats()

      let report = '# Database Performance Report\n\n'
      report += `Generated: ${new Date().toISOString()}\n\n`

      // Summary
      report += '## Summary\n\n'
      report += `- Total indexes monitored: ${indexStats.length}\n`
      report += `- Unused indexes: ${analysis.unusedIndexes.length}\n`
      report += `- Tables with performance issues: ${analysis.heavyTables.length}\n`
      report += `- Slow queries identified: ${analysis.slowQueries.length}\n\n`

      // Recommendations
      if (analysis.recommendations.length > 0) {
        report += '## Recommendations\n\n'
        analysis.recommendations.forEach((rec, index) => {
          report += `${index + 1}. ${rec}\n`
        })
        report += '\n'
      }

      // Unused indexes
      if (analysis.unusedIndexes.length > 0) {
        report += '## Unused Indexes (Consider Dropping)\n\n'
        analysis.unusedIndexes.forEach(index => {
          report += `- ${index.indexname} on ${index.tablename} (${index.size})\n`
        })
        report += '\n'
      }

      // Heavy tables
      if (analysis.heavyTables.length > 0) {
        report += '## Tables with High Sequential Scan Ratios\n\n'
        analysis.heavyTables.forEach(table => {
          const totalScans = table.seq_scan + table.idx_scan
          const seqRatio = ((table.seq_scan / totalScans) * 100).toFixed(1)
          report += `- ${table.tablename}: ${seqRatio}% sequential scans (${table.size})\n`
        })
        report += '\n'
      }

      // Slow queries
      if (analysis.slowQueries.length > 0) {
        report += '## Slow Queries Needing Attention\n\n'
        analysis.slowQueries.forEach(query => {
          report += `- Mean time: ${query.mean_time.toFixed(2)}ms, Calls: ${query.calls}\n`
          report += `  Query: ${query.query.substring(0, 100)}...\n\n`
        })
      }

      return report
    } catch (error) {
      return `Error generating performance report: ${error}`
    }
  }

  /**
   * Enable or disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }
}

// Helper function to get slow queries (fallback implementation)
async function getSlowQueries(): Promise<QueryPerformance[]> {
  // This is a simplified implementation
  // In production, you'd want to use pg_stat_statements or similar
  return []
}

// Global instance
export const databaseIndexManager = new DatabaseIndexManager()

// Convenience functions
export const indexUtils = {
  /**
   * Quick health check for database performance
   */
  async quickHealthCheck(): Promise<{
    status: 'good' | 'warning' | 'critical'
    issues: string[]
    suggestions: string[]
  }> {
    const issues: string[] = []
    const suggestions: string[] = []
    
    try {
      const analysis = await databaseIndexManager.analyzeIndexEffectiveness()
      
      if (analysis.unusedIndexes.length > 5) {
        issues.push(`${analysis.unusedIndexes.length} unused indexes detected`)
        suggestions.push('Consider dropping unused indexes to improve write performance')
      }
      
      if (analysis.heavyTables.length > 0) {
        issues.push(`${analysis.heavyTables.length} tables with high sequential scan ratios`)
        suggestions.push('Add indexes to frequently scanned tables')
      }
      
      if (analysis.slowQueries.length > 3) {
        issues.push(`${analysis.slowQueries.length} slow queries detected`)
        suggestions.push('Optimize slow queries with better indexes or query restructuring')
      }
      
      const status = issues.length === 0 ? 'good' : 
                     issues.length <= 2 ? 'warning' : 'critical'
      
      return { status, issues, suggestions }
    } catch (error) {
      return {
        status: 'critical',
        issues: ['Unable to perform health check'],
        suggestions: ['Check database connection and permissions']
      }
    }
  },

  /**
   * Log performance metrics for monitoring
   */
  async logPerformanceMetrics(): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      try {
        const healthCheck = await indexUtils.quickHealthCheck()
        
        console.group('📊 Database Performance Status')
        console.log(`Status: ${healthCheck.status.toUpperCase()}`)
        
        if (healthCheck.issues.length > 0) {
          console.warn('Issues:', healthCheck.issues)
        }
        
        if (healthCheck.suggestions.length > 0) {
          console.info('Suggestions:', healthCheck.suggestions)
        }
        
        console.groupEnd()
      } catch (error) {
        console.error('Failed to log performance metrics:', error)
      }
    }
  }
}

// Auto-start monitoring in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Log performance metrics every 5 minutes in development
  setInterval(() => {
    indexUtils.logPerformanceMetrics()
  }, 5 * 60 * 1000)
}

export default databaseIndexManager