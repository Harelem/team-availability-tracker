/**
 * Enhanced Database Service for Sprint System
 * Optimized queries with caching and performance monitoring
 * Supports the new sprint-based availability system
 */

import { supabase } from './supabase';
import { SprintLogic, SprintWorkingDay, TeamSprintSummary } from '@/utils/sprintLogic';
import type { 
  TeamMember, 
  Team, 
  ScheduleEntry, 
  CurrentGlobalSprint,
  EnhancedSprintConfig,
  TeamSprintAnalytics 
} from '@/types';

// Enhanced Performance monitoring with detailed metrics
interface QueryMetrics {
  queryName: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  cacheHit?: boolean;
  querySize?: number;
  resultSize?: number;
  slowQuery?: boolean;
}

interface PerformanceStats {
  totalQueries: number;
  averageResponseTime: number;
  cacheHitRate: number;
  slowQueryCount: number;
  errorRate: number;
  peakMemoryUsage: number;
  queriesPerSecond: number;
}

class PerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private readonly MAX_METRICS = 1000;
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private peakMemoryUsage = 0;
  private startTime = Date.now();

  trackQuery<T>(queryName: string, queryFn: () => Promise<T>, useCache = false): Promise<T> {
    const startTime = performance.now();
    const memoryStart = this.getMemoryUsage();
    
    return queryFn()
      .then((result) => {
        const duration = performance.now() - startTime;
        const memoryEnd = this.getMemoryUsage();
        const memoryDelta = memoryEnd - memoryStart;
        
        this.recordMetric(queryName, duration, true, useCache, result, memoryDelta);
        this.updatePeakMemoryUsage(memoryEnd);
        return result;
      })
      .catch((error) => {
        const duration = performance.now() - startTime;
        const memoryEnd = this.getMemoryUsage();
        const memoryDelta = memoryEnd - memoryStart;
        
        this.recordMetric(queryName, duration, false, useCache, null, memoryDelta);
        throw error;
      });
  }

  private recordMetric(queryName: string, duration: number, success: boolean, cacheHit = false, result?: any, memoryDelta = 0): void {
    const resultSize = result ? this.calculateDataSize(result) : 0;
    const slowQuery = duration > this.SLOW_QUERY_THRESHOLD;
    
    this.metrics.push({
      queryName,
      duration,
      timestamp: new Date(),
      success,
      cacheHit,
      resultSize,
      slowQuery
    });

    // Log slow queries for investigation
    if (slowQuery) {
      console.warn(`🐌 Slow query detected: ${queryName} took ${Math.round(duration)}ms`);
    }

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private updatePeakMemoryUsage(currentUsage: number): void {
    if (currentUsage > this.peakMemoryUsage) {
      this.peakMemoryUsage = currentUsage;
    }
  }

  private calculateDataSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  getMetrics(): QueryMetrics[] {
    return [...this.metrics];
  }

  getAverageQueryTime(queryName?: string): number {
    const relevantMetrics = queryName 
      ? this.metrics.filter(m => m.queryName === queryName)
      : this.metrics;
    
    if (relevantMetrics.length === 0) return 0;
    
    const totalTime = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalTime / relevantMetrics.length;
  }

  getCacheHitRate(): number {
    const cacheableQueries = this.metrics.filter(m => m.cacheHit !== undefined);
    if (cacheableQueries.length === 0) return 0;
    
    const hits = cacheableQueries.filter(m => m.cacheHit).length;
    return (hits / cacheableQueries.length) * 100;
  }

  getPerformanceStats(): PerformanceStats {
    const now = Date.now();
    const timeElapsed = (now - this.startTime) / 1000; // seconds
    const successfulQueries = this.metrics.filter(m => m.success);
    const slowQueries = this.metrics.filter(m => m.slowQuery);
    const errors = this.metrics.filter(m => !m.success);
    
    return {
      totalQueries: this.metrics.length,
      averageResponseTime: this.getAverageQueryTime(),
      cacheHitRate: this.getCacheHitRate(),
      slowQueryCount: slowQueries.length,
      errorRate: this.metrics.length > 0 ? (errors.length / this.metrics.length) * 100 : 0,
      peakMemoryUsage: Math.round(this.peakMemoryUsage / 1024 / 1024), // MB
      queriesPerSecond: timeElapsed > 0 ? this.metrics.length / timeElapsed : 0
    };
  }

  getSlowQueries(limit = 10): QueryMetrics[] {
    return this.metrics
      .filter(m => m.slowQuery)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  getTopQueriesByFrequency(limit = 10): Array<{ queryName: string; count: number; avgDuration: number }> {
    const queryStats = new Map<string, { count: number; totalDuration: number }>();
    
    this.metrics.forEach(metric => {
      const existing = queryStats.get(metric.queryName) || { count: 0, totalDuration: 0 };
      queryStats.set(metric.queryName, {
        count: existing.count + 1,
        totalDuration: existing.totalDuration + metric.duration
      });
    });
    
    return Array.from(queryStats.entries())
      .map(([queryName, stats]) => ({
        queryName,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

// Multi-level Cache implementation
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount?: number;
  lastAccessed?: number;
}

type CacheLevel = 'memory' | 'session' | 'local';

interface CacheConfig {
  level: CacheLevel;
  ttl: number;
  maxSize?: number;
  serialize?: boolean;
}

class MultiLevelQueryCache {
  private memoryCache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_MEMORY_SIZE = 100; // Maximum items in memory cache
  private cacheHits = 0;
  private cacheMisses = 0;
  
  private readonly CACHE_CONFIGS = {
    // High-frequency, small data - memory cache with short TTL
    teams: { level: 'memory' as CacheLevel, ttl: 10 * 60 * 1000, maxSize: 50 },
    team_members: { level: 'memory' as CacheLevel, ttl: 5 * 60 * 1000, maxSize: 200 },
    current_sprint: { level: 'session' as CacheLevel, ttl: 2 * 60 * 1000 },
    
    // Medium-frequency data - session storage
    sprint_schedule: { level: 'session' as CacheLevel, ttl: 3 * 60 * 1000 },
    team_analytics: { level: 'session' as CacheLevel, ttl: 5 * 60 * 1000 },
    
    // Low-frequency, larger data - local storage with longer TTL
    sprint_configs: { level: 'local' as CacheLevel, ttl: 15 * 60 * 1000 },
    company_analytics: { level: 'local' as CacheLevel, ttl: 10 * 60 * 1000 }
  } as const;

  set<T>(key: string, data: T, customTtl?: number): void {
    const config = this.getCacheConfig(key);
    const ttl = customTtl || config.ttl || this.DEFAULT_TTL;
    
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    // Store in appropriate cache level
    switch (config.level) {
      case 'memory':
        this.setMemoryCache(key, cacheItem, config.maxSize);
        break;
      case 'session':
        this.setSessionCache(key, cacheItem);
        break;
      case 'local':
        this.setLocalCache(key, cacheItem);
        break;
      default:
        this.setMemoryCache(key, cacheItem);
    }
  }

  get<T>(key: string): T | null {
    const config = this.getCacheConfig(key);
    let item: CacheItem<T> | null = null;

    // Try to get from appropriate cache level
    switch (config.level) {
      case 'memory':
        item = this.memoryCache.get(key) || null;
        break;
      case 'session':
        item = this.getSessionCache<T>(key);
        break;
      case 'local':
        item = this.getLocalCache<T>(key);
        break;
      default:
        item = this.memoryCache.get(key) || null;
    }

    if (!item) {
      this.cacheMisses++;
      return null;
    }
    
    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.invalidateKey(key);
      this.cacheMisses++;
      return null;
    }
    
    // Update access statistics
    item.accessCount = (item.accessCount || 0) + 1;
    item.lastAccessed = Date.now();
    this.cacheHits++;
    
    return item.data;
  }

  invalidate(pattern: string): void {
    // Invalidate from all cache levels
    this.invalidateMemoryCache(pattern);
    this.invalidateSessionCache(pattern);
    this.invalidateLocalCache(pattern);
  }

  // Smart invalidation based on data relationships
  smartInvalidate(triggerType: 'team_update' | 'member_update' | 'sprint_update' | 'schedule_update', entityId?: number | string): void {
    console.log(`🧹 Smart invalidation triggered: ${triggerType}${entityId ? ` for ${entityId}` : ''}`);
    
    switch (triggerType) {
      case 'team_update':
        if (entityId) {
          this.invalidate(`team_${entityId}`);
          this.invalidate(`team_members_${entityId}`);
          this.invalidate(`team_analytics_${entityId}`);
        }
        this.invalidate('all_teams');
        this.invalidate('teams_lite');
        break;
        
      case 'member_update':
        if (entityId) {
          this.invalidate(`member_${entityId}`);
          // Invalidate team caches that might contain this member
          this.invalidate('team_members_');
          this.invalidate('all_teams_with_members');
        }
        break;
        
      case 'sprint_update':
        this.invalidate('sprint');
        this.invalidate('current_sprint');
        this.invalidate('team_analytics');
        break;
        
      case 'schedule_update':
        if (entityId) {
          this.invalidate(`sprint_schedule_${entityId}`);
        }
        this.invalidate('team_analytics');
        this.invalidate('member_capacities');
        break;
        
      default:
        console.warn(`Unknown invalidation trigger: ${triggerType}`);
    }
  }

  clear(): void {
    this.memoryCache.clear();
    this.clearSessionCache();
    this.clearLocalCache();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  getStats(): { 
    memory: { size: number; keys: string[] };
    session: { size: number; keys: string[] };
    local: { size: number; keys: string[] };
    hitRate: number;
    totalRequests: number;
  } {
    return {
      memory: {
        size: this.memoryCache.size,
        keys: Array.from(this.memoryCache.keys())
      },
      session: this.getSessionStats(),
      local: this.getLocalStats(),
      hitRate: this.getHitRate(),
      totalRequests: this.cacheHits + this.cacheMisses
    };
  }

  // Private helper methods for multi-level caching
  private getCacheConfig(key: string): CacheConfig {
    // Try to match key pattern to predefined configs
    for (const [pattern, config] of Object.entries(this.CACHE_CONFIGS)) {
      if (key.includes(pattern)) {
        return config;
      }
    }
    
    // Default config for unmatched keys
    return { level: 'memory', ttl: this.DEFAULT_TTL };
  }

  private setMemoryCache<T>(key: string, item: CacheItem<T>, maxSize?: number): void {
    // Implement LRU eviction if cache is full
    if (maxSize && this.memoryCache.size >= maxSize) {
      this.evictLRUMemoryItems(1);
    }
    
    this.memoryCache.set(key, item);
  }

  private setSessionCache<T>(key: string, item: CacheItem<T>): void {
    try {
      sessionStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to set session cache:', error);
      // Fallback to memory cache
      this.memoryCache.set(key, item);
    }
  }

  private setLocalCache<T>(key: string, item: CacheItem<T>): void {
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to set local cache:', error);
      // Fallback to session cache
      this.setSessionCache(key, item);
    }
  }

  private getSessionCache<T>(key: string): CacheItem<T> | null {
    try {
      const item = sessionStorage.getItem(`cache_${key}`);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('Failed to get session cache:', error);
      return null;
    }
  }

  private getLocalCache<T>(key: string): CacheItem<T> | null {
    try {
      const item = localStorage.getItem(`cache_${key}`);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('Failed to get local cache:', error);
      return null;
    }
  }

  private invalidateKey(key: string): void {
    this.memoryCache.delete(key);
    try {
      sessionStorage.removeItem(`cache_${key}`);
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('Failed to invalidate cache key:', error);
    }
  }

  private invalidateMemoryCache(pattern: string): void {
    const keysToDelete = Array.from(this.memoryCache.keys())
      .filter(key => key.includes(pattern));
    keysToDelete.forEach(key => this.memoryCache.delete(key));
  }

  private invalidateSessionCache(pattern: string): void {
    try {
      const keys = Object.keys(sessionStorage)
        .filter(key => key.startsWith('cache_') && key.includes(pattern));
      keys.forEach(key => sessionStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to invalidate session cache:', error);
    }
  }

  private invalidateLocalCache(pattern: string): void {
    try {
      const keys = Object.keys(localStorage)
        .filter(key => key.startsWith('cache_') && key.includes(pattern));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to invalidate local cache:', error);
    }
  }

  private clearSessionCache(): void {
    try {
      const keys = Object.keys(sessionStorage)
        .filter(key => key.startsWith('cache_'));
      keys.forEach(key => sessionStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear session cache:', error);
    }
  }

  private clearLocalCache(): void {
    try {
      const keys = Object.keys(localStorage)
        .filter(key => key.startsWith('cache_'));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear local cache:', error);
    }
  }

  private evictLRUMemoryItems(count: number): void {
    const entries = Array.from(this.memoryCache.entries())
      .map(([key, item]) => ({ key, item }))
      .sort((a, b) => (a.item.lastAccessed || 0) - (b.item.lastAccessed || 0));
    
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.memoryCache.delete(entries[i].key);
    }
  }

  private getSessionStats(): { size: number; keys: string[] } {
    try {
      const keys = Object.keys(sessionStorage)
        .filter(key => key.startsWith('cache_'));
      return { size: keys.length, keys };
    } catch (error) {
      return { size: 0, keys: [] };
    }
  }

  private getLocalStats(): { size: number; keys: string[] } {
    try {
      const keys = Object.keys(localStorage)
        .filter(key => key.startsWith('cache_'));
      return { size: keys.length, keys };
    } catch (error) {
      return { size: 0, keys: [] };
    }
  }

  private getHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? (this.cacheHits / total) * 100 : 0;
  }

  // Cache warming utilities
  warmCache(keys: string[], data: Record<string, any>): void {
    console.log(`🔥 Warming cache with ${keys.length} entries`);
    keys.forEach(key => {
      if (data[key]) {
        this.set(key, data[key]);
      }
    });
  }

  // Intelligent cache warming based on usage patterns
  async warmCacheIntelligently(userRole?: string): Promise<void> {
    console.log('🧠 Intelligent cache warming started');
    
    try {
      // TODO: Implement intelligent cache warming
      // This needs to be implemented in the EnhancedDatabaseService class
      console.log('Cache warming placeholder - needs service reference');
      
      // For now, just log the warming attempt
      console.log('Cache warming would be performed here');
      
      console.log('✅ Intelligent cache warming completed (placeholder implementation)');
    } catch (error) {
      console.warn('Cache warming failed:', error);
    }
  }

  // Predictive cache loading based on user behavior
  async predictiveWarmCache(teamId?: number): Promise<void> {
    if (!teamId) return;
    
    console.log(`🔮 Predictive warming for team ${teamId} - placeholder implementation`);
    
    try {
      // TODO: Implement predictive cache warming
      // This needs to be implemented in the EnhancedDatabaseService class
      console.log('Predictive cache warming would be performed here');
      
      console.log(`✨ Predictive warming completed for team ${teamId} (placeholder)`);
    } catch (error) {
      console.warn('Predictive warming failed:', error);
    }
  }

  // Preload critical data
  async preloadCriticalData(): Promise<void> {
    console.log('🚀 Preloading critical data for optimal performance');
    await this.warmCacheIntelligently();
  }
}

/**
 * Enhanced Database Service
 */
export class EnhancedDatabaseService {
  private static instance: EnhancedDatabaseService;
  private performanceMonitor = new PerformanceMonitor();
  private cache = new MultiLevelQueryCache();

  static getInstance(): EnhancedDatabaseService {
    if (!EnhancedDatabaseService.instance) {
      EnhancedDatabaseService.instance = new EnhancedDatabaseService();
    }
    return EnhancedDatabaseService.instance;
  }

  /**
   * Sprint Configuration Methods
   */

  async getCurrentSprint(useCache = true): Promise<CurrentGlobalSprint | null> {
    const cacheKey = 'current_sprint';
    
    if (useCache) {
      const cached = this.cache.get<CurrentGlobalSprint>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this.performanceMonitor.trackQuery(
      'getCurrentSprint',
      async () => {
        const { data, error } = await supabase
          .from('current_enhanced_sprint')
          .select('*')
          .limit(1)
          .single();

        if (error) {
          console.error('Error fetching current sprint:', error);
          return null;
        }

        if (useCache && data) {
          this.cache.set(cacheKey, data, 2 * 60 * 1000); // 2 minute cache
        }

        return data;
      },
      useCache
    );
  }

  async createSprint(sprintConfig: {
    sprint_number: number;
    start_date: string;
    end_date?: string;
    length_weeks: number;
    notes?: string;
    created_by?: string;
  }): Promise<any> {
    return this.performanceMonitor.trackQuery(
      'createSprint',
      async () => {
        // Calculate end date if not provided
        const startDate = new Date(sprintConfig.start_date);
        const endDate = sprintConfig.end_date 
          ? new Date(sprintConfig.end_date)
          : SprintLogic.calculateSprintEndDate(startDate, sprintConfig.length_weeks);

        // Validate sprint configuration
        const validation = SprintLogic.validateSprintConfig(startDate, endDate, sprintConfig.length_weeks);
        if (!validation.isValid) {
          throw new Error(`Invalid sprint configuration: ${validation.errors.join(', ')}`);
        }

        // Deactivate current sprint
        await this.deactivateCurrentSprint();

        // Create new sprint
        const { data, error } = await supabase
          .from('enhanced_sprint_configs')
          .insert({
            sprint_number: sprintConfig.sprint_number,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            length_weeks: sprintConfig.length_weeks,
            is_active: true,
            notes: sprintConfig.notes || '',
            created_by: sprintConfig.created_by || 'system'
          })
          .select()
          .single();

        if (error) throw error;

        // Clear caches
        this.cache.invalidate('sprint');
        this.cache.invalidate('team');

        return data;
      }
    );
  }

  private async deactivateCurrentSprint(): Promise<void> {
    const { error } = await supabase
      .from('enhanced_sprint_configs')
      .update({ is_active: false })
      .eq('is_active', true);

    if (error) {
      console.error('Error deactivating current sprint:', error);
    }
  }

  async updateSprintDates(sprintId: string, startDate: string, endDate?: string): Promise<any> {
    return this.performanceMonitor.trackQuery(
      'updateSprintDates',
      async () => {
        const updateData: any = { start_date: startDate };
        
        if (endDate) {
          updateData.end_date = endDate;
        } else {
          // Recalculate end date based on length
          const sprint = await this.getSprintById(sprintId);
          if (sprint) {
            const calculatedEndDate = SprintLogic.calculateSprintEndDate(
              new Date(startDate), 
              sprint.length_weeks
            );
            updateData.end_date = calculatedEndDate.toISOString().split('T')[0];
          }
        }

        const { data, error } = await supabase
          .from('enhanced_sprint_configs')
          .update(updateData)
          .eq('id', sprintId)
          .select()
          .single();

        if (error) throw error;

        // Clear caches
        this.cache.invalidate('sprint');
        
        return data;
      }
    );
  }

  private async getSprintById(sprintId: string): Promise<any> {
    const { data, error } = await supabase
      .from('enhanced_sprint_configs')
      .select('*')
      .eq('id', sprintId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Team and Member Methods
   */

  async getTeams(useCache = true): Promise<Team[]> {
    const cacheKey = 'teams';
    
    if (useCache) {
      const cached = this.cache.get<Team[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this.performanceMonitor.trackQuery(
      'getTeams',
      async () => {
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .order('name');

        if (error) throw error;

        if (useCache && data) {
          this.cache.set(cacheKey, data, 10 * 60 * 1000); // 10 minute cache
        }

        return data || [];
      },
      useCache
    );
  }

  async getTeamMembers(teamId: number, useCache = true): Promise<TeamMember[]> {
    const cacheKey = `team_members_${teamId}`;
    
    if (useCache) {
      const cached = this.cache.get<TeamMember[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this.performanceMonitor.trackQuery(
      'getTeamMembers',
      async () => {
        const { data, error } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamId)
          .order('name');

        if (error) throw error;

        if (useCache && data) {
          this.cache.set(cacheKey, data, 5 * 60 * 1000); // 5 minute cache
        }

        return data || [];
      },
      useCache
    );
  }

  async getAllTeamsWithMembers(useCache = true): Promise<(Team & { team_members: TeamMember[] })[]> {
    const cacheKey = 'all_teams_with_members';
    
    if (useCache) {
      const cached = this.cache.get<(Team & { team_members: TeamMember[] })[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this.performanceMonitor.trackQuery(
      'getAllTeamsWithMembers',
      async () => {
        // Optimized: Single query with join instead of N+1 queries
        const { data, error } = await supabase
          .from('teams')
          .select(`
            *,
            team_members (
              id,
              name,
              hebrew,
              is_manager,
              email,
              team_id,
              created_at,
              updated_at
            )
          `)
          .order('name');

        if (error) throw error;

        const teamsWithMembers = (data || []).map(team => ({
          ...team,
          team_members: team.team_members || []
        }));

        if (useCache) {
          this.cache.set(cacheKey, teamsWithMembers, 5 * 60 * 1000); // 5 minute cache
          
          // Also cache individual teams and members for faster access
          teamsWithMembers.forEach(team => {
            this.cache.set(`team_${team.id}`, team, 5 * 60 * 1000);
            this.cache.set(`team_members_${team.id}`, team.team_members, 5 * 60 * 1000);
          });
        }

        return teamsWithMembers;
      },
      useCache
    );
  }

  /**
   * Schedule Entry Methods
   */

  async getSprintScheduleData(sprintId: string, teamId?: number, useCache = true): Promise<{
    [memberId: number]: { [dateKey: string]: ScheduleEntry }
  }> {
    const cacheKey = `sprint_schedule_${sprintId}${teamId ? `_team_${teamId}` : ''}`;
    
    if (useCache) {
      const cached = this.cache.get<{ [memberId: number]: { [dateKey: string]: ScheduleEntry } }>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this.performanceMonitor.trackQuery(
      'getSprintScheduleData',
      async () => {
        let query = supabase
          .from('schedule_entries')
          .select(`
            *,
            team_members!inner(
              id,
              name,
              hebrew,
              is_manager,
              team_id
            )
          `)
          .eq('sprint_id', sprintId);

        if (teamId) {
          query = query.eq('team_members.team_id', teamId);
        }

        const { data, error } = await query.order('date');

        if (error) throw error;

        // Transform data to nested structure
        const scheduleData: { [memberId: number]: { [dateKey: string]: ScheduleEntry } } = {};

        (data || []).forEach((entry: any) => {
          const memberId = entry.member_id;
          const dateKey = entry.date;

          if (!scheduleData[memberId]) {
            scheduleData[memberId] = {};
          }

          scheduleData[memberId][dateKey] = {
            id: entry.id,
            member_id: entry.member_id,
            date: entry.date,
            value: entry.value,
            reason: entry.reason,
            calculated_hours: entry.calculated_hours,
            is_weekend: entry.is_weekend,
            sprint_id: entry.sprint_id,
            created_at: entry.created_at,
            updated_at: entry.updated_at
          };
        });

        if (useCache) {
          this.cache.set(cacheKey, scheduleData, 3 * 60 * 1000); // 3 minute cache
        }

        return scheduleData;
      },
      useCache
    );
  }

  async setScheduleEntry(entry: Omit<ScheduleEntry, 'id' | 'created_at' | 'updated_at'>): Promise<ScheduleEntry> {
    return this.performanceMonitor.trackQuery(
      'setScheduleEntry',
      async () => {
        const { data, error } = await supabase
          .from('schedule_entries')
          .upsert(
            {
              member_id: entry.member_id,
              date: entry.date,
              value: entry.value,
              reason: entry.reason,
              sprint_id: entry.sprint_id
            },
            {
              onConflict: 'member_id,date',
              ignoreDuplicates: false
            }
          )
          .select()
          .single();

        if (error) throw error;

        // Invalidate relevant caches
        this.cache.invalidate('sprint_schedule');
        this.cache.invalidate('team_analytics');

        return data;
      }
    );
  }

  async batchSetScheduleEntries(entries: Omit<ScheduleEntry, 'id' | 'created_at' | 'updated_at'>[]): Promise<ScheduleEntry[]> {
    return this.performanceMonitor.trackQuery(
      'batchSetScheduleEntries',
      async () => {
        const batchSize = 100;
        const results: ScheduleEntry[] = [];

        for (let i = 0; i < entries.length; i += batchSize) {
          const batch = entries.slice(i, i + batchSize);
          
          const { data, error } = await supabase
            .from('schedule_entries')
            .upsert(
              batch.map(entry => ({
                member_id: entry.member_id,
                date: entry.date,
                value: entry.value,
                reason: entry.reason,
                sprint_id: entry.sprint_id
              })),
              {
                onConflict: 'member_id,date',
                ignoreDuplicates: false
              }
            )
            .select();

          if (error) throw error;
          if (data) results.push(...data);
        }

        // Invalidate relevant caches
        this.cache.invalidate('sprint_schedule');
        this.cache.invalidate('team_analytics');

        return results;
      }
    );
  }

  async autoGenerateWeekendEntries(sprintId: string): Promise<number> {
    return this.performanceMonitor.trackQuery(
      'autoGenerateWeekendEntries',
      async () => {
        const { data, error } = await supabase
          .rpc('auto_generate_weekend_entries', { sprint_id: sprintId });

        if (error) throw error;

        // Invalidate relevant caches
        this.cache.invalidate('sprint_schedule');

        return data || 0;
      }
    );
  }

  /**
   * Analytics and Summary Methods
   */

  async getTeamSprintAnalytics(teamId?: number, useCache = true): Promise<any[]> {
    const cacheKey = `team_analytics${teamId ? `_${teamId}` : ''}`;
    
    if (useCache) {
      const cached = this.cache.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this.performanceMonitor.trackQuery(
      'getTeamSprintAnalytics',
      async () => {
        let query = supabase
          .from('team_sprint_analytics')
          .select('*');

        if (teamId) {
          query = query.eq('team_id', teamId);
        }

        const { data, error } = await query.order('team_name');

        if (error) throw error;

        if (useCache && data) {
          this.cache.set(cacheKey, data, 5 * 60 * 1000); // 5 minute cache
        }

        return data || [];
      },
      useCache
    );
  }

  async getMemberSprintCapacity(memberId: number, sprintId: string): Promise<any> {
    return this.performanceMonitor.trackQuery(
      'getMemberSprintCapacity',
      async () => {
        const { data, error } = await supabase
          .rpc('calculate_member_sprint_capacity', {
            member_id: memberId,
            sprint_id: sprintId
          });

        if (error) throw error;

        return data?.[0] || null;
      }
    );
  }

  /**
   * Batch Operations for Performance Optimization
   */

  async batchGetTeamData(teamIds: number[], useCache = true): Promise<Map<number, { team: Team; members: TeamMember[]; analytics?: any }>> {
    const cacheKey = `batch_team_data_${teamIds.sort().join(',')}`;
    
    if (useCache) {
      const cached = this.cache.get<Map<number, any>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this.performanceMonitor.trackQuery(
      'batchGetTeamData',
      async () => {
        // Single query to get all teams and their members
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select(`
            *,
            team_members (
              id,
              name,
              hebrew,
              is_manager,
              email,
              team_id,
              created_at,
              updated_at
            )
          `)
          .in('id', teamIds);

        if (teamsError) throw teamsError;

        // Batch get analytics for all teams
        const { data: analyticsData, error: analyticsError } = await supabase
          .from('team_sprint_analytics')
          .select('*')
          .in('team_id', teamIds);

        if (analyticsError) {
          console.warn('Analytics data unavailable:', analyticsError);
        }

        const result = new Map<number, { team: Team; members: TeamMember[]; analytics?: any }>();
        
        (teamsData || []).forEach(team => {
          const analytics = analyticsData?.find(a => a.team_id === team.id);
          result.set(team.id, {
            team,
            members: team.team_members || [],
            analytics
          });
        });

        if (useCache) {
          this.cache.set(cacheKey, result, 3 * 60 * 1000); // 3 minute cache for batch data
        }

        return result;
      },
      useCache
    );
  }

  async batchGetMemberCapacities(memberIds: number[], sprintId: string, useCache = true): Promise<Map<number, any>> {
    const cacheKey = `batch_member_capacities_${sprintId}_${memberIds.sort().join(',')}`;
    
    if (useCache) {
      const cached = this.cache.get<Map<number, any>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this.performanceMonitor.trackQuery(
      'batchGetMemberCapacities',
      async () => {
        // Use database function for batch capacity calculation
        const { data, error } = await supabase
          .rpc('batch_calculate_member_capacities', {
            member_ids: memberIds,
            sprint_id: sprintId
          });

        if (error) {
          console.warn('Batch capacity calculation failed, falling back to individual queries');
          // Fallback to individual queries
          const result = new Map<number, any>();
          await Promise.all(
            memberIds.map(async (memberId) => {
              try {
                const capacity = await this.getMemberSprintCapacity(memberId, sprintId);
                result.set(memberId, capacity);
              } catch (err) {
                console.warn(`Failed to get capacity for member ${memberId}:`, err);
                result.set(memberId, null);
              }
            })
          );
          return result;
        }

        const result = new Map<number, any>();
        (data || []).forEach((item: any) => {
          result.set(item.member_id, item);
        });

        if (useCache) {
          this.cache.set(cacheKey, result, 2 * 60 * 1000); // 2 minute cache for capacity data
        }

        return result;
      },
      useCache
    );
  }

  /**
   * Query Optimization Methods
   */

  async getTeamDataOptimized(teamId: number, includeAnalytics = true, useCache = true): Promise<{
    team: Team;
    members: TeamMember[];
    scheduleData?: any;
    analytics?: any;
  }> {
    const cacheKey = `optimized_team_${teamId}_${includeAnalytics ? 'with' : 'without'}_analytics`;
    
    if (useCache) {
      const cached = this.cache.get<any>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this.performanceMonitor.trackQuery(
      'getTeamDataOptimized',
      async () => {
        const currentSprint = await this.getCurrentSprint(useCache);
        if (!currentSprint) {
          throw new Error('No active sprint found');
        }

        // Single comprehensive query
        const queries = [
          // Team and members
          supabase
            .from('teams')
            .select(`
              *,
              team_members (
                id,
                name,
                hebrew,
                is_manager,
                email,
                team_id
              )
            `)
            .eq('id', teamId)
            .single(),
          
          // Schedule data for current sprint
          this.getSprintScheduleData(currentSprint.id.toString(), teamId, useCache)
        ];

        // Add analytics query if requested
        if (includeAnalytics) {
          queries.push(
            supabase
              .from('team_sprint_analytics')
              .select('*')
              .eq('team_id', teamId)
              .single()
          );
        }

        const results = await Promise.allSettled(queries);
        
        const teamResult = results[0];
        const scheduleResult = results[1];
        const analyticsResult = includeAnalytics ? results[2] : null;

        if (teamResult.status === 'rejected') {
          throw new Error(`Failed to fetch team data: ${teamResult.reason}`);
        }

        const { data: teamData, error: teamError } = teamResult.value as any;
        if (teamError) throw teamError;

        const scheduleData = scheduleResult.status === 'fulfilled' ? scheduleResult.value : {};
        const analytics = analyticsResult?.status === 'fulfilled' ? (analyticsResult.value as any)?.data : null;

        const result = {
          team: teamData,
          members: teamData?.team_members || [],
          scheduleData,
          analytics
        };

        if (useCache) {
          this.cache.set(cacheKey, result, 3 * 60 * 1000); // 3 minute cache
        }

        return result;
      },
      useCache
    );
  }

  /**
   * Selective Field Fetching
   */

  async getTeamsLite(useCache = true): Promise<Array<{ id: number; name: string; member_count: number }>> {
    const cacheKey = 'teams_lite';
    
    if (useCache) {
      const cached = this.cache.get<Array<{ id: number; name: string; member_count: number }>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this.performanceMonitor.trackQuery(
      'getTeamsLite',
      async () => {
        const { data, error } = await supabase
          .from('teams')
          .select(`
            id,
            name,
            team_members!inner(count)
          `)
          .order('name');

        if (error) throw error;

        const result = (data || []).map(team => ({
          id: team.id,
          name: team.name,
          member_count: Array.isArray(team.team_members) ? team.team_members.length : 0
        }));

        if (useCache) {
          this.cache.set(cacheKey, result, 10 * 60 * 1000); // 10 minute cache for lite data
        }

        return result;
      },
      useCache
    );
  }

  async getTeamMembersLite(teamId: number, useCache = true): Promise<Array<{ id: number; name: string; is_manager: boolean }>> {
    const cacheKey = `team_members_lite_${teamId}`;
    
    if (useCache) {
      const cached = this.cache.get<Array<{ id: number; name: string; is_manager: boolean }>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this.performanceMonitor.trackQuery(
      'getTeamMembersLite',
      async () => {
        const { data, error } = await supabase
          .from('team_members')
          .select('id, name, is_manager')
          .eq('team_id', teamId)
          .order('name');

        if (error) throw error;

        const result = data || [];
        
        if (useCache) {
          this.cache.set(cacheKey, result, 8 * 60 * 1000); // 8 minute cache for lite member data
        }

        return result;
      },
      useCache
    );
  }

  /**
   * Performance and Monitoring Methods
   */

  getPerformanceMetrics(): {
    averageQueryTime: number;
    cacheHitRate: number;
    totalQueries: number;
    recentMetrics: QueryMetrics[];
    performanceStats: PerformanceStats;
    slowQueries: QueryMetrics[];
    topQueries: Array<{ queryName: string; count: number; avgDuration: number }>;
  } {
    const metrics = this.performanceMonitor.getMetrics();
    
    return {
      averageQueryTime: this.performanceMonitor.getAverageQueryTime(),
      cacheHitRate: this.performanceMonitor.getCacheHitRate(),
      totalQueries: metrics.length,
      recentMetrics: metrics.slice(-20), // Last 20 queries
      performanceStats: this.performanceMonitor.getPerformanceStats(),
      slowQueries: this.performanceMonitor.getSlowQueries(),
      topQueries: this.performanceMonitor.getTopQueriesByFrequency()
    };
  }

  getCacheStats(): {
    memory: { size: number; keys: string[] };
    session: { size: number; keys: string[] };
    local: { size: number; keys: string[] };
    hitRate: number;
    totalRequests: number;
  } {
    return this.cache.getStats();
  }

  clearCache(): void {
    this.cache.clear();
  }

  invalidateCache(pattern: string): void {
    console.log(`🗿 Invalidating cache pattern: ${pattern}`);
    this.cache.invalidate(pattern);
  }

  smartInvalidateCache(triggerType: 'team_update' | 'member_update' | 'sprint_update' | 'schedule_update', entityId?: number | string): void {
    this.cache.smartInvalidate(triggerType, entityId);
  }

  // Advanced cache management methods
  warmupCache(userRole?: string): Promise<void> {
    return this.cache.warmCacheIntelligently(userRole);
  }

  async warmupCacheForTeam(teamId: number): Promise<void> {
    return this.cache.predictiveWarmCache(teamId);
  }

  optimizeCache(): void {
    const stats = this.getCacheStats();
    const metrics = this.getPerformanceMetrics();
    
    console.log('📊 Cache Optimization Report:');
    console.log(`  Memory Cache: ${stats.memory.size} items`);
    console.log(`  Session Cache: ${stats.session.size} items`);
    console.log(`  Local Cache: ${stats.local.size} items`);
    console.log(`  Cache Hit Rate: ${stats.hitRate.toFixed(1)}%`);
    console.log(`  Average Query Time: ${metrics.averageQueryTime.toFixed(0)}ms`);
    console.log(`  Slow Queries: ${metrics.slowQueries.length}`);
    
    // Auto-optimization: Clear old entries if hit rate is low
    if (stats.hitRate < 30 && stats.totalRequests > 50) {
      console.log('🧹 Low hit rate detected, clearing stale cache entries');
      this.clearCache();
    }
  }

  getPerformanceSummary(): {
    status: 'excellent' | 'good' | 'fair' | 'poor';
    score: number;
    recommendations: string[];
    metrics: {
      avgResponseTime: number;
      cacheEfficiency: number;
      errorRate: number;
      slowQueryRate: number;
    };
  } {
    const stats = this.getPerformanceMetrics();
    const cacheStats = this.getCacheStats();
    
    const metrics = {
      avgResponseTime: stats.averageQueryTime,
      cacheEfficiency: cacheStats.hitRate,
      errorRate: stats.performanceStats.errorRate,
      slowQueryRate: (stats.slowQueries.length / stats.totalQueries) * 100
    };
    
    // Calculate performance score (0-100)
    let score = 100;
    const recommendations: string[] = [];
    
    // Response time scoring (0-40 points)
    if (metrics.avgResponseTime > 2000) {
      score -= 40;
      recommendations.push('Optimize slow database queries');
    } else if (metrics.avgResponseTime > 1000) {
      score -= 20;
      recommendations.push('Consider query optimization');
    } else if (metrics.avgResponseTime > 500) {
      score -= 10;
    }
    
    // Cache efficiency scoring (0-30 points)
    if (metrics.cacheEfficiency < 50) {
      score -= 30;
      recommendations.push('Improve caching strategy');
    } else if (metrics.cacheEfficiency < 70) {
      score -= 15;
      recommendations.push('Fine-tune cache TTL values');
    } else if (metrics.cacheEfficiency < 85) {
      score -= 5;
    }
    
    // Error rate scoring (0-20 points)
    if (metrics.errorRate > 10) {
      score -= 20;
      recommendations.push('Investigate and fix query errors');
    } else if (metrics.errorRate > 5) {
      score -= 10;
      recommendations.push('Monitor and reduce error rate');
    } else if (metrics.errorRate > 2) {
      score -= 5;
    }
    
    // Slow query rate scoring (0-10 points)
    if (metrics.slowQueryRate > 20) {
      score -= 10;
      recommendations.push('Optimize slow queries');
    } else if (metrics.slowQueryRate > 10) {
      score -= 5;
    }
    
    score = Math.max(0, score);
    
    const status = score >= 90 ? 'excellent' : 
                   score >= 75 ? 'good' : 
                   score >= 60 ? 'fair' : 'poor';
    
    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal');
    }
    
    return {
      status,
      score,
      recommendations,
      metrics
    };
  }

  /**
   * Utility Methods for Sprint Operations
   */

  async setFullSprintAvailability(memberId: number, sprintId: string, isManager = false): Promise<void> {
    const sprint = await this.getCurrentSprint(false);
    if (!sprint) throw new Error('No active sprint found');

    const sprintDays = SprintLogic.getWorkingDays(
      new Date(sprint.sprint_start_date),
      new Date(sprint.sprint_end_date)
    );

    const entries: Omit<ScheduleEntry, 'id' | 'created_at' | 'updated_at'>[] = [];

    sprintDays.forEach(day => {
      if (day.isWeekend) {
        // Auto-generate weekend entries
        entries.push({
          member_id: memberId,
          date: day.date.toISOString().split('T')[0],
          value: 'X',
          reason: 'Weekend (auto-generated)',
          sprint_id: sprintId
        });
      } else {
        // Working days - managers get 0.5, regular members get 1
        entries.push({
          member_id: memberId,
          date: day.date.toISOString().split('T')[0],
          value: isManager ? '0.5' : '1',
          reason: isManager ? 'Management day' : undefined,
          sprint_id: sprintId
        });
      }
    });

    await this.batchSetScheduleEntries(entries);
  }

  async clearMemberSprintData(memberId: number, sprintId: string): Promise<void> {
    return this.performanceMonitor.trackQuery(
      'clearMemberSprintData',
      async () => {
        const { error } = await supabase
          .from('schedule_entries')
          .delete()
          .eq('member_id', memberId)
          .eq('sprint_id', sprintId);

        if (error) throw error;

        // Invalidate relevant caches
        this.cache.invalidate('sprint_schedule');
        this.cache.invalidate('team_analytics');
      }
    );
  }

  /**
   * Performance Monitoring and Alerting
   */

  enablePerformanceAlerts(): void {
    console.log('🚨 Performance monitoring alerts enabled');
    
    // Check performance every 5 minutes
    setInterval(() => {
      const summary = this.getPerformanceSummary();
      
      if (summary.status === 'poor') {
        console.warn('🚨 PERFORMANCE ALERT: Poor database performance detected!');
        console.warn(`Score: ${summary.score}/100`);
        console.warn('Recommendations:', summary.recommendations);
      } else if (summary.status === 'fair') {
        console.warn('⚠️ Performance warning: Database performance is suboptimal');
        console.warn(`Score: ${summary.score}/100`);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  logPerformanceReport(): void {
    const summary = this.getPerformanceSummary();
    const cacheStats = this.getCacheStats();
    const slowQueries = this.performanceMonitor.getSlowQueries(5);
    
    console.group('📊 DATABASE PERFORMANCE REPORT');
    console.log(`🏆 Overall Status: ${summary.status.toUpperCase()} (${summary.score}/100)`);
    console.log(`⌚ Avg Response Time: ${summary.metrics.avgResponseTime.toFixed(0)}ms`);
    console.log(`💾 Cache Hit Rate: ${summary.metrics.cacheEfficiency.toFixed(1)}%`);
    console.log(`❌ Error Rate: ${summary.metrics.errorRate.toFixed(1)}%`);
    console.log(`🐌 Slow Query Rate: ${summary.metrics.slowQueryRate.toFixed(1)}%`);
    
    if (slowQueries.length > 0) {
      console.group('🐌 Top Slow Queries:');
      slowQueries.forEach((query, i) => {
        console.log(`${i + 1}. ${query.queryName}: ${Math.round(query.duration)}ms`);
      });
      console.groupEnd();
    }
    
    console.log('🟢 Recommendations:');
    summary.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
    
    console.groupEnd();
  }

  /**
   * Migration and Maintenance Methods
   */

  async migrateLegacyData(): Promise<{ success: boolean; message: string }> {
    return this.performanceMonitor.trackQuery(
      'migrateLegacyData',
      async () => {
        try {
          // Link existing schedule entries to current sprint
          const currentSprint = await this.getCurrentSprint(false);
          if (!currentSprint) {
            return { success: false, message: 'No active sprint found for migration' };
          }

          const { data, error } = await supabase
            .from('schedule_entries')
            .update({ sprint_id: currentSprint.id })
            .is('sprint_id', null)
            .gte('date', currentSprint.sprint_start_date)
            .lte('date', currentSprint.sprint_end_date)
            .select();

          if (error) throw error;

          // Clear all caches after migration
          this.cache.clear();

          return {
            success: true,
            message: `Successfully migrated ${data?.length || 0} schedule entries to current sprint`
          };
        } catch (error) {
          console.error('Migration error:', error);
          return {
            success: false,
            message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      }
    );
  }
}

// Export singleton instance
export const enhancedDatabaseService = EnhancedDatabaseService.getInstance();
export default enhancedDatabaseService;

// Initialize performance monitoring in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🚀 Enhanced Database Service initialized with performance monitoring');
  enhancedDatabaseService.enablePerformanceAlerts();
  
  // Log performance report every 10 minutes in development
  setInterval(() => {
    enhancedDatabaseService.logPerformanceReport();
  }, 10 * 60 * 1000);
  
  // Add global access for debugging
  (window as any).dbPerformance = {
    getReport: () => enhancedDatabaseService.logPerformanceReport(),
    getMetrics: () => enhancedDatabaseService.getPerformanceMetrics(),
    getCacheStats: () => enhancedDatabaseService.getCacheStats(),
    clearCache: () => enhancedDatabaseService.clearCache(),
    optimizeCache: () => enhancedDatabaseService.optimizeCache()
  };
}

// Export types for external use
export type { QueryMetrics, PerformanceStats, CacheLevel, CacheConfig };
