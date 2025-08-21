/**
 * Service for calculating missing team members in sprint completion
 */

import { DatabaseService } from './database';
import { TeamMember, ScheduleEntry } from '@/types';
import { MissingMemberData, MissingMember, CompletedMember } from '@/types/tooltipTypes';
import { calculateWorkingDaysBetween } from './calculationService';

// Cache for missing member data
const missingMembersCache = new Map<string, MissingMemberData>();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export class MissingMembersService {
  /**
   * Get missing members for a team in a specific sprint period
   */
  static async getMissingMembers(
    teamId: number,
    teamName: string,
    sprintPeriod: { start: string; end: string }
  ): Promise<MissingMemberData> {
    const cacheKey = `${teamId}-${sprintPeriod.start}-${sprintPeriod.end}`;
    
    // Check cache first
    const cached = missingMembersCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.lastCalculated)) {
      console.log(`📋 Cache hit for team ${teamName} missing members`);
      return cached;
    }

    console.log(`🔍 Calculating missing members for team ${teamName}...`);

    try {
      // Get team members
      const teamMembers = await DatabaseService.getTeamMembers(teamId);
      
      if (teamMembers.length === 0) {
        console.warn(`⚠️ Team ${teamName} has no members`);
        return this.createEmptyResult(teamId, teamName, sprintPeriod);
      }

      // Calculate working days in sprint period
      const totalWorkingDays = calculateWorkingDaysBetween(
        new Date(sprintPeriod.start),
        new Date(sprintPeriod.end)
      );

      // Get schedule data for all team members in this period
      const scheduleData = await DatabaseService.getScheduleEntries(
        sprintPeriod.start,
        sprintPeriod.end,
        teamId
      );

      // Analyze each member's completion status
      const missingMembers: MissingMember[] = [];
      const completedMembers: CompletedMember[] = [];

      teamMembers.forEach(member => {
        const memberSchedule = scheduleData[member.id] || {};
        const completionResult = this.analyzeMemberCompletion(
          member,
          memberSchedule,
          totalWorkingDays
        );

        if (completionResult.isCompleted) {
          completedMembers.push({
            id: member.id,
            name: member.name,
            hebrew: member.hebrew
          });
        } else {
          missingMembers.push({
            id: member.id,
            name: member.name,
            hebrew: member.hebrew,
            completionRate: completionResult.completionRate,
            missingDays: completionResult.missingDays
          });
        }
      });

      const result: MissingMemberData = {
        teamId,
        teamName,
        sprintPeriod,
        totalWorkingDays,
        missingMembers,
        completedMembers,
        lastCalculated: new Date()
      };

      // Cache the result
      missingMembersCache.set(cacheKey, result);
      
      console.log(`✅ Missing members calculated: ${missingMembers.length}/${teamMembers.length} missing`);
      return result;

    } catch (error) {
      console.error(`❌ Error calculating missing members for team ${teamName}:`, error);
      return this.createEmptyResult(teamId, teamName, sprintPeriod);
    }
  }

  /**
   * Analyze individual member's completion status
   */
  private static analyzeMemberCompletion(
    member: TeamMember,
    memberSchedule: { [dateKey: string]: ScheduleEntry },
    totalWorkingDays: number
  ) {
    const filledDays = Object.keys(memberSchedule).length;
    const completionRate = totalWorkingDays > 0 ? Math.round((filledDays / totalWorkingDays) * 100) : 0;
    const missingDays = Math.max(0, totalWorkingDays - filledDays);
    
    // Consider completed if they have entries for all working days (100% completion)
    const isCompleted = completionRate >= 100;

    console.log(`👤 ${member.name}: ${filledDays}/${totalWorkingDays} days (${completionRate}%) - ${isCompleted ? 'Complete' : 'Missing'}`);

    return {
      isCompleted,
      completionRate,
      missingDays
    };
  }

  /**
   * Create empty result structure
   */
  private static createEmptyResult(
    teamId: number,
    teamName: string,
    sprintPeriod: { start: string; end: string }
  ): MissingMemberData {
    return {
      teamId,
      teamName,
      sprintPeriod,
      totalWorkingDays: 0,
      missingMembers: [],
      completedMembers: [],
      lastCalculated: new Date()
    };
  }

  /**
   * Check if cached data is still valid
   */
  private static isCacheValid(lastCalculated: Date): boolean {
    const now = new Date().getTime();
    const cacheTime = lastCalculated.getTime();
    return (now - cacheTime) < CACHE_DURATION_MS;
  }

  /**
   * Clear cache for a specific team or all teams
   */
  static clearCache(teamId?: number): void {
    if (teamId) {
      // Clear cache for specific team
      const keysToDelete = Array.from(missingMembersCache.keys())
        .filter(key => key.startsWith(`${teamId}-`));
      
      keysToDelete.forEach(key => missingMembersCache.delete(key));
      console.log(`🗑️ Cleared missing members cache for team ${teamId}`);
    } else {
      // Clear all cache
      missingMembersCache.clear();
      console.log('🗑️ Cleared all missing members cache');
    }
  }

  /**
   * Get cache statistics for debugging
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: missingMembersCache.size,
      keys: Array.from(missingMembersCache.keys())
    };
  }

  /**
   * Preload missing members data for multiple teams
   * Useful for warming up cache before user interaction
   */
  static async preloadMissingMembers(
    teams: Array<{ id: number; name: string }>,
    sprintPeriod: { start: string; end: string }
  ): Promise<void> {
    console.log(`🔄 Preloading missing members data for ${teams.length} teams...`);
    
    const promises = teams.map(team =>
      this.getMissingMembers(team.id, team.name, sprintPeriod)
    );

    try {
      await Promise.all(promises);
      console.log('✅ Missing members data preloaded successfully');
    } catch (error) {
      console.error('❌ Error preloading missing members data:', error);
    }
  }
}