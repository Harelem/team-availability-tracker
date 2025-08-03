// Sprint History API Endpoint
// Provides sprint navigation data and historical sprint information

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${method} not allowed` });
  }

  try {
    return await handleGet(req, res);
  } catch (error) {
    console.error('Sprint history API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/sprints/history - Get all sprint history for navigation
// GET /api/sprints/history?current=true - Get current sprint with navigation context
async function handleGet(req, res) {
  const { current, sprintNumber } = req.query;

  try {
    // Get current sprint from global_sprint_settings
    const { data: currentSprintData, error: currentError } = await supabase
      .from('global_sprint_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (currentError) {
      throw currentError;
    }

    if (!currentSprintData) {
      return res.status(404).json({ error: 'No current sprint found' });
    }

    // Generate sprint history based on current sprint
    const currentSprintNumber = currentSprintData.current_sprint_number;
    const sprintLengthWeeks = currentSprintData.sprint_length_weeks;
    const currentStartDate = new Date(currentSprintData.sprint_start_date);

    // Generate historical and future sprints (±10 sprints from current)
    const sprints = [];
    const sprintRange = 10;

    for (let i = -sprintRange; i <= sprintRange; i++) {
      const sprintNum = currentSprintNumber + i;
      if (sprintNum <= 0) continue; // Skip negative sprint numbers

      const startDate = new Date(currentStartDate);
      startDate.setDate(startDate.getDate() + (i * sprintLengthWeeks * 7));
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (sprintLengthWeeks * 7) - 1);

      const isCurrent = sprintNum === currentSprintNumber;
      const isPast = sprintNum < currentSprintNumber;
      const isFuture = sprintNum > currentSprintNumber;

      sprints.push({
        sprint_number: sprintNum,
        sprint_start_date: startDate.toISOString().split('T')[0],
        sprint_end_date: endDate.toISOString().split('T')[0],
        sprint_length_weeks: sprintLengthWeeks,
        is_current: isCurrent,
        is_past: isPast,
        is_future: isFuture,
        status: isCurrent ? 'current' : isPast ? 'completed' : 'planned'
      });
    }

    // Sort by sprint number
    sprints.sort((a, b) => a.sprint_number - b.sprint_number);

    // If requesting current sprint with context
    if (current === 'true') {
      const currentIndex = sprints.findIndex(s => s.is_current);
      const currentSprint = sprints[currentIndex];
      
      return res.status(200).json({
        current: currentSprint,
        previous: currentIndex > 0 ? sprints[currentIndex - 1] : null,
        next: currentIndex < sprints.length - 1 ? sprints[currentIndex + 1] : null,
        position: {
          current: currentSprintNumber,
          total: currentSprintNumber + sprintRange, // Total includes future planned sprints
          index: currentIndex + 1
        }
      });
    }

    // If requesting specific sprint
    if (sprintNumber) {
      const targetSprintNum = parseInt(sprintNumber);
      const targetSprint = sprints.find(s => s.sprint_number === targetSprintNum);
      
      if (!targetSprint) {
        return res.status(404).json({ error: 'Sprint not found' });
      }

      const targetIndex = sprints.findIndex(s => s.sprint_number === targetSprintNum);
      
      return res.status(200).json({
        sprint: targetSprint,
        previous: targetIndex > 0 ? sprints[targetIndex - 1] : null,
        next: targetIndex < sprints.length - 1 ? sprints[targetIndex + 1] : null,
        position: {
          current: targetSprintNum,
          total: currentSprintNumber + sprintRange,
          index: targetIndex + 1
        }
      });
    }

    // Return all sprints for general history
    return res.status(200).json({
      sprints,
      current_sprint: currentSprintNumber,
      total_sprints: sprints.length
    });

  } catch (error) {
    console.error('Error fetching sprint history:', error);
    return res.status(500).json({ error: 'Failed to fetch sprint history' });
  }
}