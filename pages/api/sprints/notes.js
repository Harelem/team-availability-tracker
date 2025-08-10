// Sprint Notes API Endpoint
// Handles CRUD operations for sprint notes

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Sprint notes API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/sprints/notes?sprintNumber=5 - Get notes for specific sprint
// GET /api/sprints/notes - Get all sprint notes
async function handleGet(req, res) {
  const { sprintNumber, startDate } = req.query;

  try {
    let query = supabase
      .from('sprint_notes')
      .select('id, sprint_number, sprint_start_date, sprint_end_date, notes, created_by, updated_by, created_at, updated_at')
      .order('sprint_number', { ascending: false });

    if (sprintNumber) {
      query = query.eq('sprint_number', parseInt(sprintNumber));
    }

    if (startDate) {
      query = query.eq('sprint_start_date', startDate);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // If looking for specific sprint and none found, return empty note
    if (sprintNumber && (!data || data.length === 0)) {
      return res.status(200).json({
        sprint_number: parseInt(sprintNumber),
        notes: '',
        sprint_start_date: null,
        sprint_end_date: null,
        created_at: null,
        updated_at: null
      });
    }

    return res.status(200).json(sprintNumber ? data[0] : data);
  } catch (error) {
    console.error('Error fetching sprint notes:', error);
    return res.status(500).json({ error: 'Failed to fetch sprint notes' });
  }
}

// POST /api/sprints/notes - Create new sprint notes
async function handlePost(req, res) {
  const { sprintNumber, sprintStartDate, sprintEndDate, notes, createdBy = 'user' } = req.body;

  if (!sprintNumber || !sprintStartDate || !sprintEndDate) {
    return res.status(400).json({ 
      error: 'Missing required fields: sprintNumber, sprintStartDate, sprintEndDate' 
    });
  }

  try {
    const { data, error } = await supabase
      .from('sprint_notes')
      .insert({
        sprint_number: sprintNumber,
        sprint_start_date: sprintStartDate,
        sprint_end_date: sprintEndDate,
        notes: notes || '',
        created_by: createdBy,
        updated_by: createdBy
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate constraint
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Sprint notes already exist for this sprint' });
      }
      throw error;
    }

    return res.status(201).json(data);
  } catch (error) {
    console.error('Error creating sprint notes:', error);
    return res.status(500).json({ error: 'Failed to create sprint notes' });
  }
}

// PUT /api/sprints/notes - Update existing sprint notes
async function handlePut(req, res) {
  const { sprintNumber, sprintStartDate, notes, updatedBy = 'user' } = req.body;

  if (!sprintNumber || !sprintStartDate) {
    return res.status(400).json({ 
      error: 'Missing required fields: sprintNumber, sprintStartDate' 
    });
  }

  try {
    const { data, error } = await supabase
      .from('sprint_notes')
      .update({
        notes: notes || '',
        updated_by: updatedBy
      })
      .eq('sprint_number', sprintNumber)
      .eq('sprint_start_date', sprintStartDate)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Sprint notes not found' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error updating sprint notes:', error);
    return res.status(500).json({ error: 'Failed to update sprint notes' });
  }
}

// DELETE /api/sprints/notes?sprintNumber=5&startDate=2024-01-01 - Delete sprint notes
async function handleDelete(req, res) {
  const { sprintNumber, startDate } = req.query;

  if (!sprintNumber || !startDate) {
    return res.status(400).json({ 
      error: 'Missing required parameters: sprintNumber, startDate' 
    });
  }

  try {
    const { data, error } = await supabase
      .from('sprint_notes')
      .delete()
      .eq('sprint_number', parseInt(sprintNumber))
      .eq('sprint_start_date', startDate)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Sprint notes not found' });
    }

    return res.status(200).json({ message: 'Sprint notes deleted successfully' });
  } catch (error) {
    console.error('Error deleting sprint notes:', error);
    return res.status(500).json({ error: 'Failed to delete sprint notes' });
  }
}