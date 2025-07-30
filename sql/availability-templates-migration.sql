-- Availability Templates System Migration
-- Creates table for storing reusable availability patterns

-- Create availability_templates table
CREATE TABLE IF NOT EXISTS availability_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  pattern JSONB NOT NULL, -- Stores the availability pattern
  is_public BOOLEAN DEFAULT false, -- Can other team members use this template
  created_by INTEGER REFERENCES team_members(id), -- Changed to INTEGER to match existing team_members.id
  team_id INTEGER REFERENCES teams(id), -- Optional: team-specific templates
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_availability_templates_created_by ON availability_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_availability_templates_team_id ON availability_templates(team_id);
CREATE INDEX IF NOT EXISTS idx_availability_templates_is_public ON availability_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_availability_templates_usage_count ON availability_templates(usage_count DESC);

-- Enable Row Level Security
ALTER TABLE availability_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view public templates and their own templates
CREATE POLICY "Users can view public templates and their own templates" ON availability_templates
  FOR SELECT USING (
    is_public = true OR 
    created_by = auth.uid()::INTEGER OR
    team_id IN (
      SELECT team_id FROM team_members WHERE id = auth.uid()::INTEGER
    )
  );

-- Users can create their own templates
CREATE POLICY "Users can create their own templates" ON availability_templates
  FOR INSERT WITH CHECK (created_by = auth.uid()::INTEGER);

-- Users can update their own templates
CREATE POLICY "Users can update their own templates" ON availability_templates
  FOR UPDATE USING (created_by = auth.uid()::INTEGER);

-- Users can delete their own templates
CREATE POLICY "Users can delete their own templates" ON availability_templates
  FOR DELETE USING (created_by = auth.uid()::INTEGER);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_availability_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_availability_templates_updated_at
  BEFORE UPDATE ON availability_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_availability_templates_updated_at();

-- Insert sample public templates
INSERT INTO availability_templates (name, description, pattern, is_public, created_by) VALUES
(
  'Full Week', 
  'Standard full-time schedule - all working days (Sun-Thu)',
  '{"sun": 1, "mon": 1, "tue": 1, "wed": 1, "thu": 1, "fri": 0, "sat": 0}', 
  true, 
  NULL
),
(
  'Half Days Only', 
  'All half days for transition periods or part-time work',
  '{"sun": 0.5, "mon": 0.5, "tue": 0.5, "wed": 0.5, "thu": 0.5, "fri": 0, "sat": 0}', 
  true, 
  NULL
),
(
  'Three Day Week', 
  'Sunday, Tuesday, Thursday schedule for flexible work',
  '{"sun": 1, "mon": 0, "tue": 1, "wed": 0, "thu": 1, "fri": 0, "sat": 0}', 
  true, 
  NULL
),
(
  'Front-loaded Week',
  'Work early in the week - Sunday through Tuesday',
  '{"sun": 1, "mon": 1, "tue": 1, "wed": 0, "thu": 0, "fri": 0, "sat": 0}',
  true,
  NULL
),
(
  'Back-loaded Week',
  'Work later in the week - Tuesday through Thursday', 
  '{"sun": 0, "mon": 0, "tue": 1, "wed": 1, "thu": 1, "fri": 0, "sat": 0}',
  true,
  NULL
),
(
  'Alternate Days',
  'Every other day schedule for maximum flexibility',
  '{"sun": 1, "mon": 0, "tue": 1, "wed": 0, "thu": 1, "fri": 0, "sat": 0}',
  true,
  NULL
),
(
  'Medical Appointments',
  'Half day Wednesdays for regular medical appointments',
  '{"sun": 1, "mon": 1, "tue": 1, "wed": 0.5, "thu": 1, "fri": 0, "sat": 0}',
  true,
  NULL
);

-- Add comments for documentation
COMMENT ON TABLE availability_templates IS 'Stores reusable availability patterns for quick schedule setup';
COMMENT ON COLUMN availability_templates.pattern IS 'JSONB object storing weekly pattern with day keys (sun, mon, tue, wed, thu, fri, sat) and availability values (0, 0.5, 1) - Israeli work week: Sun-Thu working, Fri-Sat weekend';
COMMENT ON COLUMN availability_templates.is_public IS 'Whether this template can be used by all users (true) or only by creator and team members (false)';
COMMENT ON COLUMN availability_templates.usage_count IS 'Number of times this template has been applied, used for popularity sorting';