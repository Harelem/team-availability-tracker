/**
 * Tests for the Enhanced Schedule Update Manager
 * Validates non-blocking operations, optimistic updates, and error handling
 */

import { scheduleUpdateManager, ScheduleUpdateManager } from '../scheduleUpdateManager'
import { queryBatcher } from '../QueryBatcher'

// Mock dependencies
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      delete: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) })) })),
      upsert: jest.fn(() => ({ error: null }))
    }))
  }
}))

jest.mock('../QueryBatcher', () => ({
  queryBatcher: {
    execute: jest.fn()
  }
}))

jest.mock('@/utils/dataConsistencyManager', () => ({
  dataConsistencyManager: {
    invalidateCache: jest.fn()
  }
}))

jest.mock('@/utils/logger', () => ({
  default: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

describe('ScheduleUpdateManager', () => {
  let manager: ScheduleUpdateManager
  
  beforeEach(() => {
    manager = new ScheduleUpdateManager()
    jest.clearAllMocks()
  })

  afterEach(() => {
    manager.clearOptimisticUpdates()
  })

  describe('Basic functionality', () => {
    it('should create optimistic update immediately', async () => {
      const promise = manager.updateScheduleEntry(1, '2023-12-01', '1', 'Working')
      
      // Should have optimistic update before promise resolves
      const optimisticValue = manager.getOptimisticValue(1, '2023-12-01')
      expect(optimisticValue).not.toBeNull()
      expect(optimisticValue?.value).toBe('1')
      expect(optimisticValue?.reason).toBe('Working')
      
      await promise
    })

    it('should return immediately without blocking', async () => {
      const startTime = Date.now()
      
      // Mock a slow database operation
      ;(queryBatcher.execute as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )
      
      const promise = manager.updateScheduleEntry(1, '2023-12-01', '1')
      
      // Promise should resolve immediately (non-blocking)
      await promise
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(50) // Should be much faster than 100ms
    })

    it('should deduplicate concurrent updates to same key', async () => {
      const promises = [
        manager.updateScheduleEntry(1, '2023-12-01', '1'),
        manager.updateScheduleEntry(1, '2023-12-01', '0.5'),
        manager.updateScheduleEntry(1, '2023-12-01', 'X')
      ]
      
      await Promise.all(promises)
      
      // Should only execute once due to deduplication
      expect(queryBatcher.execute).toHaveBeenCalledTimes(1)
      
      // Should have the latest value
      const optimisticValue = manager.getOptimisticValue(1, '2023-12-01')
      expect(optimisticValue?.value).toBe('X')
    })
  })

  describe('Error handling and retry logic', () => {
    it('should retry on failure up to max retries', async () => {
      const error = new Error('Database error')
      ;(queryBatcher.execute as jest.Mock)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(undefined)

      await manager.updateScheduleEntry(1, '2023-12-01', '1')
      
      // Allow time for retries
      await new Promise(resolve => setTimeout(resolve, 3500))
      
      // Should have attempted retries
      expect(queryBatcher.execute).toHaveBeenCalledTimes(4) // Initial + 3 retries
    })

    it('should handle rollback on permanent failure', async () => {
      const error = new Error('Permanent database error')
      ;(queryBatcher.execute as jest.Mock).mockRejectedValue(error)

      const promise = manager.updateScheduleEntry(1, '2023-12-01', '1')
      
      // Wait for all retries to complete
      await new Promise(resolve => setTimeout(resolve, 4000))
      
      // Optimistic update should be marked as failed
      const optimisticValue = manager.getOptimisticValue(1, '2023-12-01')
      expect(optimisticValue?.failed).toBe(true)
      
      await expect(promise).rejects.toThrow('Failed to update schedule after')
    })
  })

  describe('Event system', () => {
    it('should emit optimistic update events', async () => {
      const eventSpy = jest.fn()
      window.addEventListener('schedule-optimistic-update', eventSpy)
      
      await manager.updateScheduleEntry(1, '2023-12-01', '1')
      
      expect(eventSpy).toHaveBeenCalled()
      
      window.removeEventListener('schedule-optimistic-update', eventSpy)
    })

    it('should emit rollback events on failure', async () => {
      const eventSpy = jest.fn()
      window.addEventListener('schedule-optimistic-rollback', eventSpy)
      
      ;(queryBatcher.execute as jest.Mock).mockRejectedValue(new Error('Test error'))
      
      await manager.updateScheduleEntry(1, '2023-12-01', '1')
      
      // Wait for retries to fail
      await new Promise(resolve => setTimeout(resolve, 4000))
      
      expect(eventSpy).toHaveBeenCalled()
      
      window.removeEventListener('schedule-optimistic-rollback', eventSpy)
    })
  })

  describe('Statistics and monitoring', () => {
    it('should provide accurate statistics', async () => {
      await manager.updateScheduleEntry(1, '2023-12-01', '1')
      await manager.updateScheduleEntry(2, '2023-12-01', '0.5')
      
      const stats = manager.getStats()
      expect(stats.optimisticUpdatesCount).toBe(2)
    })

    it('should clear all optimistic updates', () => {
      manager.updateScheduleEntry(1, '2023-12-01', '1')
      manager.updateScheduleEntry(2, '2023-12-01', '0.5')
      
      expect(manager.getOptimisticUpdates().size).toBe(2)
      
      manager.clearOptimisticUpdates()
      
      expect(manager.getOptimisticUpdates().size).toBe(0)
    })
  })

  describe('Performance characteristics', () => {
    it('should handle high-frequency updates efficiently', async () => {
      const startTime = Date.now()
      
      // Simulate rapid user interactions
      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(manager.updateScheduleEntry(1, `2023-12-${String(i % 30 + 1).padStart(2, '0')}`, '1'))
      }
      
      await Promise.all(promises)
      
      const endTime = Date.now()
      
      // Should complete quickly due to optimistic updates
      expect(endTime - startTime).toBeLessThan(100)
      
      // Should deduplicate many requests
      expect(queryBatcher.execute).toHaveBeenCalledTimes(30) // Only 30 unique dates
    })
  })
})