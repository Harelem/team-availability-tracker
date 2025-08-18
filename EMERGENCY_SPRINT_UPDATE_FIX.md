# EMERGENCY FIX: Sprint Update Function Missing

## Problem
The `updateSprint` function is missing from `DatabaseService` in `/src/lib/database.ts`, causing the error:
```
Error updating sprint: { code: "PGRST116", details: "The result contains 0 rows", hint: null, message: "JSON object requested, multiple (or no) rows returned" }
```

## Root Causes
1. **Missing updateSprint function** - The database service doesn't have this function
2. **Missing RLS policies** - The sprint_history table only has SELECT policy, missing UPDATE/INSERT/DELETE

## Immediate Fix

### 1. Add Missing RLS Policies
Run this SQL in Supabase SQL Editor:

```sql
-- Enable UPDATE operations on sprint_history
DROP POLICY IF EXISTS "Allow update access to sprint_history" ON sprint_history;
CREATE POLICY "Allow update access to sprint_history" 
ON sprint_history 
FOR UPDATE 
USING (true);

-- Enable INSERT operations for creating new sprints
DROP POLICY IF EXISTS "Allow insert access to sprint_history" ON sprint_history;
CREATE POLICY "Allow insert access to sprint_history" 
ON sprint_history 
FOR INSERT 
WITH CHECK (true);

-- Enable DELETE operations for sprint management
DROP POLICY IF EXISTS "Allow delete access to sprint_history" ON sprint_history;
CREATE POLICY "Allow delete access to sprint_history" 
ON sprint_history 
FOR DELETE 
USING (true);
```

### 2. Add Missing updateSprint Function
Add this function to `DatabaseService` in `/src/lib/database.ts`:

```typescript
async updateSprint(sprintId: number, sprintData: CreateSprintRequest): Promise<SprintHistoryEntry | null> {
  if (!isSupabaseConfigured()) {
    return null
  }
  
  try {
    console.log('🔄 Updating sprint:', sprintId, sprintData)
    
    // Validate sprint data
    if (!sprintData.sprint_start_date || !sprintData.sprint_end_date) {
      console.error('❌ Missing required dates for sprint update')
      return null
    }
    
    // Calculate sprint length if not provided
    const startDate = new Date(sprintData.sprint_start_date)
    const endDate = new Date(sprintData.sprint_end_date)
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const calculatedWeeks = Math.round(durationDays / 7)
    
    const updateData = {
      sprint_name: sprintData.sprint_name || null,
      sprint_start_date: sprintData.sprint_start_date,
      sprint_end_date: sprintData.sprint_end_date,
      sprint_length_weeks: sprintData.sprint_length_weeks || calculatedWeeks,
      description: sprintData.description || null,
      updated_at: new Date().toISOString(),
      updated_by: sprintData.created_by || 'system'
    }
    
    console.log('📝 Update data prepared:', updateData)
    
    const { data, error } = await supabase
      .from('sprint_history')
      .update(updateData)
      .eq('id', sprintId)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Database error updating sprint:', error)
      return null
    }
    
    if (!data) {
      console.error('❌ No sprint found with ID:', sprintId)
      return null
    }
    
    console.log('✅ Sprint updated successfully:', data.id)
    
    // Return enriched data with calculated fields
    const today = new Date()
    const start = new Date(data.sprint_start_date)
    const end = new Date(data.sprint_end_date)
    
    let progress_percentage = 0
    let days_remaining = 0
    let status = data.status || 'upcoming'
    
    if (start > today) {
      status = 'upcoming'
    } else if (end < today) {
      status = 'completed'
      progress_percentage = 100
    } else {
      status = 'active'
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const daysPassed = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      progress_percentage = Math.round((daysPassed / totalDays) * 100)
      days_remaining = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    }
    
    const total_days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    return {
      ...data,
      status,
      progress_percentage,
      days_remaining,
      total_days
    }
    
  } catch (error) {
    console.error('❌ Error in updateSprint:', error)
    return null
  }
},
```

### 3. Also Add Missing deleteSprint Function
```typescript
async deleteSprint(sprintId: number): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false
  }
  
  try {
    console.log('🗑️ Deleting sprint:', sprintId)
    
    const { error } = await supabase
      .from('sprint_history')
      .delete()
      .eq('id', sprintId)
    
    if (error) {
      console.error('❌ Error deleting sprint:', error)
      return false
    }
    
    console.log('✅ Sprint deleted successfully')
    return true
    
  } catch (error) {
    console.error('❌ Error in deleteSprint:', error)
    return false
  }
},
```

## Quick Test
After implementing the fixes:

1. Try updating a sprint in the COO dashboard
2. Check browser console for the success logs
3. Verify the sprint calendar shows updated dates

## Why This Happened
The sprint planning calendar component was calling `DatabaseService.updateSprint()` but this function was never implemented in the database service, only `createSprint` was available.

The RLS policies were also incomplete - only SELECT was enabled, but UPDATE/INSERT/DELETE were missing, preventing any modifications to sprint records.
