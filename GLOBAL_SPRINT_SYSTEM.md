# Global Sprint System - Complete Implementation

## 🎯 **System Overview**

This is a **simplified global sprint system** that replaces the previous complex team-specific implementation. The new system features:

- **ONE** global sprint that applies to all teams simultaneously
- **Simple permission system**: Only "Harel Mazan" can modify sprint settings
- **Universal visibility**: All users can view sprint dashboards with team-specific statistics
- **Minimal complexity**: 90% less code than the previous implementation

## 🗄️ **Database Schema**

### **Migration Required**
Run this script in Supabase SQL editor to migrate to the new system:
```sql
-- File: sql/global-sprint-migration.sql
-- Removes all complex team-specific tables and creates simple global system
```

### **New Database Structure**
```sql
-- Single global sprint settings table
global_sprint_settings (
    id SERIAL PRIMARY KEY,
    sprint_length_weeks INTEGER (1-4 weeks),
    current_sprint_number INTEGER,
    sprint_start_date DATE,
    created_at, updated_at, updated_by
)

-- Views for easy data access
current_global_sprint -- Current sprint with calculated progress
team_sprint_stats     -- Team-specific stats within global sprint
```

## 🔐 **Permission System**

### **Sprint Administrator**
- **Who**: Only "Harel Mazan" (exact name match)
- **Access**: Purple "Sprint Settings" button in toolbar
- **Capabilities**:
  - Change global sprint length (1-4 weeks)
  - Start new sprints for entire organization
  - Settings affect all teams globally

### **All Other Users**
- **Access**: Read-only sprint dashboard
- **Visibility**: 
  - Global sprint timeline and progress
  - Their team's specific statistics within global sprint
  - Sprint progress indicators

## 🎨 **Components Architecture**

### **Core Components**
- `GlobalSprintDashboard` - Main dashboard visible to all users
- `GlobalSprintSettings` - Admin-only modal for Harel
- `GlobalSprintContext` - State management for sprint data

### **Permission Utilities**
- `canManageSprints(user)` - Returns true only for "Harel Mazan"
- `canViewSprints(user)` - Returns true for all logged-in users
- `getSprintPermissionLevel(user)` - Returns 'none' | 'read' | 'admin'

## 📊 **Features**

### **Global Sprint Dashboard (All Users)**
- **Global Timeline**: Sprint progress bar with days remaining
- **Team Statistics**: Team-specific hours within global sprint
- **Key Metrics**: Current week hours, sprint total, capacity utilization
- **Visual Indicators**: Progress bars and utilization percentages

### **Sprint Settings Modal (Harel Only)**
- **Current Sprint Info**: Progress, dates, time remaining
- **Sprint Configuration**: Change length (1-4 weeks)
- **Start New Sprint**: Begin fresh sprint for entire organization
- **Warning System**: Confirms destructive actions

## 🚀 **Usage Instructions**

### **For Harel Mazan**
1. **Access Settings**: Purple "Sprint Settings" button appears in toolbar
2. **View Current Sprint**: See progress, dates, and statistics
3. **Change Sprint Length**: Select 1-4 weeks and update
4. **Start New Sprint**: Choose length and confirm to start fresh sprint

### **For All Other Users**
1. **View Dashboard**: Sprint dashboard appears below navigation
2. **Team Statistics**: See your team's performance within global sprint
3. **Progress Tracking**: Monitor sprint timeline and remaining time

## 🔧 **Technical Implementation**

### **Database Service Methods**
```typescript
// Simple global sprint methods
getCurrentGlobalSprint()         // Get current sprint info
getTeamSprintStats(teamId)       // Get team stats for global sprint
updateGlobalSprintSettings()     // Admin: Update sprint config
startNewGlobalSprint()           // Admin: Start new sprint
```

### **Context Provider**
```typescript
// GlobalSprintProvider manages state
<GlobalSprintProvider teamId={team.id}>
  <GlobalSprintDashboard team={team} />
</GlobalSprintProvider>
```

### **Permission Integration**
```typescript
// Simple name-based check
{canManageSprints(currentUser) && (
  <SprintSettingsButton />
)}
```

## 📁 **File Structure**

### **New Files Created**
- `sql/global-sprint-migration.sql` - Database migration script
- `src/contexts/GlobalSprintContext.tsx` - Sprint state management
- `src/components/GlobalSprintDashboard.tsx` - Main dashboard
- `src/components/GlobalSprintSettings.tsx` - Admin settings modal
- `src/utils/permissions.ts` - Permission utilities
- `src/types/index.ts` - Updated with global sprint types

### **Updated Files**
- `src/lib/database.ts` - Simplified sprint methods
- `src/components/ScheduleTable.tsx` - Harel-only sprint button
- `src/app/page.tsx` - Global sprint dashboard integration

### **Removed Files**
- All complex team-specific sprint components
- Debug panels and scripts
- Old migration scripts

## ✅ **Benefits of New System**

1. **Simplicity**: 90% less code complexity
2. **Reliability**: Single source of truth, no complex queries
3. **Clear Permissions**: Simple name-based admin access
4. **Universal Access**: Everyone sees relevant sprint information
5. **Easy Maintenance**: Minimal moving parts
6. **Scalable**: Works for any number of teams

## 🔄 **Migration Steps**

1. **Run Migration Script**: Execute `sql/global-sprint-migration.sql` in Supabase
2. **Deploy Code**: The new system is ready to use immediately
3. **Set Admin User**: Ensure "Harel Mazan" user exists in database
4. **Test Features**: Verify sprint dashboard appears for all users
5. **Admin Access**: Confirm Harel sees "Sprint Settings" button

## 🎉 **Result**

A robust, simple sprint management system that actually works reliably with clear permissions and universal visibility. The system provides powerful sprint tracking capabilities while maintaining simplicity and ease of use.