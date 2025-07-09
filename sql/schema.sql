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