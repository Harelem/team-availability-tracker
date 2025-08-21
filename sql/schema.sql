-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    hebrew VARCHAR(255) NOT NULL,
    is_manager BOOLEAN DEFAULT false,
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create schedule_entries table
CREATE TABLE IF NOT EXISTS schedule_entries (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    value VARCHAR(3) NOT NULL CHECK (value IN ('1', '0.5', 'X')),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(member_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schedule_entries_member_id ON schedule_entries(member_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_date ON schedule_entries(date);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_member_date ON schedule_entries(member_id, date);

-- Enable Row Level Security
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;

-- Create policies (allow read/write for authenticated users)
CREATE POLICY "Allow read access to team_members" ON team_members
    FOR SELECT USING (true);

CREATE POLICY "Allow all operations on team_members" ON team_members
    FOR ALL USING (true);

CREATE POLICY "Allow read access to schedule_entries" ON schedule_entries
    FOR SELECT USING (true);

CREATE POLICY "Allow insert/update/delete on schedule_entries" ON schedule_entries
    FOR ALL USING (true);

-- Insert initial team members
INSERT INTO team_members (name, hebrew, is_manager) VALUES
    ('Natan Shemesh', 'נתן שמש', false),
    ('Ido Keller', 'עידו קלר', false),
    ('Amit Zriker', 'עמית צריקר', true),
    ('Alon Mesika', 'אלון מסיקה', false),
    ('Nadav Aharon', 'נדב אהרון', false),
    ('Yarom Kloss', 'ירום קלוס', false),
    ('Ziv Edelstein', 'זיב אדלשטיין', false),
    ('Harel Mazan', 'הראל מזן', true)
ON CONFLICT (name) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_entries_updated_at BEFORE UPDATE ON schedule_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create availability_templates table for storing reusable availability patterns
CREATE TABLE IF NOT EXISTS availability_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  pattern JSONB NOT NULL, -- Stores the availability pattern
  is_public BOOLEAN DEFAULT false, -- Can other team members use this template
  created_by INTEGER REFERENCES team_members(id), -- Reference to team_members.id
  team_id INTEGER, -- Optional: team-specific templates (no FK constraint for flexibility)
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for availability_templates performance
CREATE INDEX IF NOT EXISTS idx_availability_templates_created_by ON availability_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_availability_templates_team_id ON availability_templates(team_id);
CREATE INDEX IF NOT EXISTS idx_availability_templates_is_public ON availability_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_availability_templates_usage_count ON availability_templates(usage_count DESC);

-- Enable Row Level Security for availability_templates
ALTER TABLE availability_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for availability_templates (simplified to match existing pattern)
-- Allow read access to all templates (matches existing policies for other tables)
CREATE POLICY "Allow read access to availability_templates" ON availability_templates
  FOR SELECT USING (true);

-- Allow insert/update/delete access to all authenticated users (matches existing pattern)
CREATE POLICY "Allow all operations on availability_templates" ON availability_templates
  FOR ALL USING (true);

-- Create trigger to update updated_at timestamp for availability_templates
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
)
ON CONFLICT (id) DO NOTHING;