-- Sprint Notes Migration
-- Create table for storing sprint notes and historical data

-- Create sprint_notes table
CREATE TABLE IF NOT EXISTS sprint_notes (
    id SERIAL PRIMARY KEY,
    sprint_number INTEGER NOT NULL,
    sprint_start_date DATE NOT NULL,
    sprint_end_date DATE NOT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    updated_by VARCHAR(255) NOT NULL DEFAULT 'system',
    
    -- Ensure unique notes per sprint
    UNIQUE(sprint_number, sprint_start_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sprint_notes_sprint_number ON sprint_notes(sprint_number);
CREATE INDEX IF NOT EXISTS idx_sprint_notes_start_date ON sprint_notes(sprint_start_date);
CREATE INDEX IF NOT EXISTS idx_sprint_notes_created_at ON sprint_notes(created_at);

-- Enable Row Level Security
ALTER TABLE sprint_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for sprint_notes (allow read/write for authenticated users)
CREATE POLICY "Allow read access to sprint_notes" ON sprint_notes
    FOR SELECT USING (true);

CREATE POLICY "Allow all operations on sprint_notes" ON sprint_notes
    FOR ALL USING (true);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_sprint_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sprint_notes_updated_at
    BEFORE UPDATE ON sprint_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_sprint_notes_updated_at();

-- Insert initial note for current sprint if it exists
DO $$
DECLARE
    current_sprint_data RECORD;
BEGIN
    -- Get current sprint from global_sprint_settings
    SELECT 
        current_sprint_number,
        sprint_start_date,
        sprint_start_date + (sprint_length_weeks * 7) * INTERVAL '1 day' as sprint_end_date
    INTO current_sprint_data
    FROM global_sprint_settings 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Insert initial note if current sprint exists
    IF current_sprint_data IS NOT NULL THEN
        INSERT INTO sprint_notes (sprint_number, sprint_start_date, sprint_end_date, notes, created_by, updated_by)
        VALUES (
            current_sprint_data.current_sprint_number,
            current_sprint_data.sprint_start_date,
            current_sprint_data.sprint_end_date,
            '',
            'system',
            'system'
        )
        ON CONFLICT (sprint_number, sprint_start_date) DO NOTHING;
    END IF;
END $$;