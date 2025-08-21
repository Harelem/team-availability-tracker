-- Recognition System Migration
-- Creates tables and functions for user achievements and recognition metrics

-- ============================================================================
-- USER ACHIEVEMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  achievement_data JSONB DEFAULT '{}',
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  week_start DATE,
  sprint_id VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON user_achievements(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_week_start ON user_achievements(week_start);

-- Enable Row Level Security
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own achievements and team achievements" ON user_achievements
  FOR SELECT USING (
    user_id = auth.uid()::INTEGER OR
    user_id IN (
      SELECT tm.id FROM team_members tm 
      WHERE tm.team_id IN (
        SELECT team_id FROM team_members WHERE id = auth.uid()::INTEGER
      )
    )
  );

CREATE POLICY "System can create achievements" ON user_achievements
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own achievements" ON user_achievements
  FOR UPDATE USING (user_id = auth.uid()::INTEGER);

-- ============================================================================
-- RECOGNITION METRICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS recognition_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id INTEGER REFERENCES team_members(id) ON DELETE CASCADE,
  metric_name VARCHAR(50) NOT NULL,
  metric_value INTEGER NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique metrics per user per period
  UNIQUE(user_id, metric_name, period_start, period_end)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recognition_metrics_user_id ON recognition_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_recognition_metrics_name ON recognition_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_recognition_metrics_period ON recognition_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_recognition_metrics_updated ON recognition_metrics(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE recognition_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own metrics and team metrics" ON recognition_metrics
  FOR SELECT USING (
    user_id = auth.uid()::INTEGER OR
    user_id IN (
      SELECT tm.id FROM team_members tm 
      WHERE tm.team_id IN (
        SELECT team_id FROM team_members WHERE id = auth.uid()::INTEGER
      )
    )
  );

CREATE POLICY "System can manage recognition metrics" ON recognition_metrics
  FOR ALL WITH CHECK (true);

-- ============================================================================
-- RECOGNITION CALCULATION FUNCTIONS
-- ============================================================================

-- Function to calculate weekly completion rate
CREATE OR REPLACE FUNCTION calculate_weekly_completion_rate(user_id_param INTEGER, week_start_param DATE)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  completion_rate INTEGER;
  total_days INTEGER := 5; -- Monday to Friday
  completed_days INTEGER;
BEGIN
  -- Count days with schedule entries in the given week
  SELECT COUNT(DISTINCT date_trunc('day', se.date))
  INTO completed_days
  FROM schedule_entries se
  WHERE se.team_member_id = user_id_param
    AND se.date >= week_start_param
    AND se.date <= week_start_param + INTERVAL '4 days'
    AND se.value IS NOT NULL;
    
  -- Calculate percentage
  completion_rate := COALESCE((completed_days * 100 / NULLIF(total_days, 0)), 0);
  
  RETURN completion_rate;
END;
$$;

-- Function to calculate user recognition metrics
CREATE OR REPLACE FUNCTION calculate_user_recognition_metrics()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  current_week_start DATE;
  user_record RECORD;
  completion_rate INTEGER;
  streak_count INTEGER;
BEGIN
  -- Get current week start (Monday)
  current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  
  -- Process each team member
  FOR user_record IN SELECT id FROM team_members LOOP
    
    -- Calculate weekly completion rate
    completion_rate := calculate_weekly_completion_rate(user_record.id, current_week_start);
    
    -- Insert or update weekly completion rate
    INSERT INTO recognition_metrics (user_id, metric_name, metric_value, period_start, period_end)
    VALUES (
      user_record.id,
      'weekly_completion_rate',
      completion_rate,
      current_week_start,
      current_week_start + INTERVAL '6 days'
    )
    ON CONFLICT (user_id, metric_name, period_start, period_end) 
    DO UPDATE SET 
      metric_value = EXCLUDED.metric_value,
      updated_at = NOW();
    
    -- Calculate streak count (consecutive weeks with 100% completion)
    SELECT COUNT(*)
    INTO streak_count
    FROM (
      SELECT rm.period_start,
             LAG(rm.period_start) OVER (ORDER BY rm.period_start) as prev_week
      FROM recognition_metrics rm
      WHERE rm.user_id = user_record.id
        AND rm.metric_name = 'weekly_completion_rate'
        AND rm.metric_value = 100
        AND rm.period_start <= current_week_start
      ORDER BY rm.period_start DESC
      LIMIT 10 -- Look back 10 weeks max
    ) streak_calc
    WHERE period_start = current_week_start - (ROW_NUMBER() OVER (ORDER BY period_start DESC) - 1) * INTERVAL '7 days';
    
    -- Insert or update streak count
    INSERT INTO recognition_metrics (user_id, metric_name, metric_value, period_start, period_end)
    VALUES (
      user_record.id,
      'consistency_streak',
      COALESCE(streak_count, 0),
      current_week_start,
      current_week_start + INTERVAL '6 days'
    )
    ON CONFLICT (user_id, metric_name, period_start, period_end) 
    DO UPDATE SET 
      metric_value = EXCLUDED.metric_value,
      updated_at = NOW();
      
  END LOOP;
END;
$$;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_user_achievements(user_id_param INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  current_week_start DATE;
  completion_rate INTEGER;
  streak_count INTEGER;
  early_planning_count INTEGER;
  existing_achievement_count INTEGER;
BEGIN
  -- Get current week start
  current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  
  -- Get current metrics
  SELECT metric_value INTO completion_rate
  FROM recognition_metrics
  WHERE user_id = user_id_param
    AND metric_name = 'weekly_completion_rate'
    AND period_start = current_week_start;
    
  SELECT metric_value INTO streak_count
  FROM recognition_metrics
  WHERE user_id = user_id_param
    AND metric_name = 'consistency_streak'
    AND period_start = current_week_start;
    
  -- Award "Consistent Updater" achievement (100% completion rate)
  IF completion_rate >= 100 THEN
    SELECT COUNT(*) INTO existing_achievement_count
    FROM user_achievements
    WHERE user_id = user_id_param
      AND achievement_type = 'consistent_updater'
      AND week_start = current_week_start;
      
    IF existing_achievement_count = 0 THEN
      INSERT INTO user_achievements (user_id, achievement_type, achievement_data, week_start)
      VALUES (
        user_id_param,
        'consistent_updater',
        jsonb_build_object('completion_rate', completion_rate, 'week_start', current_week_start),
        current_week_start
      );
    END IF;
  END IF;
  
  -- Award "Perfect Week" achievement (100% completion + early planning)
  IF completion_rate >= 100 THEN
    -- Check if user planned early (by Wednesday for next week)
    SELECT COUNT(*) INTO early_planning_count
    FROM schedule_entries se
    WHERE se.team_member_id = user_id_param
      AND se.date >= current_week_start + INTERVAL '7 days'
      AND se.date <= current_week_start + INTERVAL '11 days'
      AND se.created_at <= current_week_start + INTERVAL '3 days' + INTERVAL '23:59:59 hours';
      
    IF early_planning_count >= 3 THEN
      SELECT COUNT(*) INTO existing_achievement_count
      FROM user_achievements
      WHERE user_id = user_id_param
        AND achievement_type = 'perfect_week'
        AND week_start = current_week_start;
        
      IF existing_achievement_count = 0 THEN
        INSERT INTO user_achievements (user_id, achievement_type, achievement_data, week_start)
        VALUES (
          user_id_param,
          'perfect_week',
          jsonb_build_object(
            'completion_rate', completion_rate,
            'early_planning_count', early_planning_count,
            'week_start', current_week_start
          ),
          current_week_start
        );
      END IF;
    END IF;
  END IF;
  
  -- Award "Reliability Streak" achievements
  IF streak_count >= 3 THEN
    SELECT COUNT(*) INTO existing_achievement_count
    FROM user_achievements
    WHERE user_id = user_id_param
      AND achievement_type = 'reliability_streak'
      AND (achievement_data->>'streak_length')::INTEGER = streak_count;
      
    IF existing_achievement_count = 0 THEN
      INSERT INTO user_achievements (user_id, achievement_type, achievement_data, week_start)
      VALUES (
        user_id_param,
        'reliability_streak',
        jsonb_build_object('streak_length', streak_count, 'achieved_at', current_week_start),
        current_week_start
      );
    END IF;
  END IF;
END;
$$;

-- Function to get team recognition leaderboard
CREATE OR REPLACE FUNCTION get_team_recognition_leaderboard(timeframe_param TEXT DEFAULT 'week')
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  hebrew TEXT,
  team_name TEXT,
  consistency_score INTEGER,
  total_achievements INTEGER,
  recent_achievements JSONB,
  streak_count INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  period_start_date DATE;
  period_end_date DATE;
BEGIN
  -- Determine period based on timeframe
  CASE timeframe_param
    WHEN 'week' THEN
      period_start_date := DATE_TRUNC('week', CURRENT_DATE)::DATE;
      period_end_date := period_start_date + INTERVAL '6 days';
    WHEN 'month' THEN
      period_start_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
      period_end_date := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
    WHEN 'quarter' THEN
      period_start_date := DATE_TRUNC('quarter', CURRENT_DATE)::DATE;
      period_end_date := (DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months - 1 day')::DATE;
    ELSE
      period_start_date := DATE_TRUNC('week', CURRENT_DATE)::DATE;
      period_end_date := period_start_date + INTERVAL '6 days';
  END CASE;
  
  RETURN QUERY
  SELECT 
    tm.id,
    tm.name,
    tm.hebrew,
    t.name as team_name,
    COALESCE(rm_completion.metric_value, 0) as consistency_score,
    COALESCE(achievement_counts.total_achievements, 0) as total_achievements,
    COALESCE(recent_achievements_agg.achievements, '[]'::JSONB) as recent_achievements,
    COALESCE(rm_streak.metric_value, 0) as streak_count
  FROM team_members tm
  LEFT JOIN teams t ON tm.team_id = t.id
  LEFT JOIN recognition_metrics rm_completion ON (
    rm_completion.user_id = tm.id 
    AND rm_completion.metric_name = 'weekly_completion_rate'
    AND rm_completion.period_start = period_start_date
  )
  LEFT JOIN recognition_metrics rm_streak ON (
    rm_streak.user_id = tm.id 
    AND rm_streak.metric_name = 'consistency_streak'
    AND rm_streak.period_start = period_start_date
  )
  LEFT JOIN (
    SELECT 
      ua.user_id,
      COUNT(*) as total_achievements
    FROM user_achievements ua
    WHERE ua.earned_at >= period_start_date AND ua.earned_at <= period_end_date + INTERVAL '23:59:59 hours'
    GROUP BY ua.user_id
  ) achievement_counts ON achievement_counts.user_id = tm.id
  LEFT JOIN (
    SELECT 
      ua.user_id,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'type', ua.achievement_type,
          'earned_at', ua.earned_at,
          'data', ua.achievement_data
        ) ORDER BY ua.earned_at DESC
      ) as achievements
    FROM user_achievements ua
    WHERE ua.earned_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY ua.user_id
  ) recent_achievements_agg ON recent_achievements_agg.user_id = tm.id
  ORDER BY consistency_score DESC, total_achievements DESC, streak_count DESC;
END;
$$;

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recognition_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_achievements_updated_at
  BEFORE UPDATE ON user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_recognition_updated_at();

CREATE TRIGGER update_recognition_metrics_updated_at
  BEFORE UPDATE ON recognition_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_recognition_updated_at();

-- ============================================================================
-- SAMPLE DATA AND INITIAL SETUP
-- ============================================================================

-- Run initial metric calculation
SELECT calculate_user_recognition_metrics();

-- Add sample achievements for testing (only if no achievements exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_achievements LIMIT 1) THEN
    -- Add some sample achievements for the first few team members
    INSERT INTO user_achievements (user_id, achievement_type, achievement_data, week_start)
    SELECT 
      tm.id,
      'consistent_updater',
      jsonb_build_object('completion_rate', 100, 'week_start', DATE_TRUNC('week', CURRENT_DATE - INTERVAL '7 days')),
      DATE_TRUNC('week', CURRENT_DATE - INTERVAL '7 days')::DATE
    FROM team_members tm
    ORDER BY tm.id
    LIMIT 3;
    
    INSERT INTO user_achievements (user_id, achievement_type, achievement_data, week_start)
    SELECT 
      tm.id,
      'perfect_week',
      jsonb_build_object('completion_rate', 100, 'early_planning_count', 5, 'week_start', DATE_TRUNC('week', CURRENT_DATE - INTERVAL '14 days')),
      DATE_TRUNC('week', CURRENT_DATE - INTERVAL '14 days')::DATE
    FROM team_members tm
    ORDER BY tm.id
    LIMIT 2;
  END IF;
END
$$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE user_achievements IS 'Stores user achievements and recognition badges earned through consistent planning behavior';
COMMENT ON COLUMN user_achievements.achievement_type IS 'Type of achievement: consistent_updater, early_planner, perfect_week, team_helper, sprint_champion, reliability_streak';
COMMENT ON COLUMN user_achievements.achievement_data IS 'JSONB data containing achievement-specific metadata and context';
COMMENT ON COLUMN user_achievements.week_start IS 'Start date of the week when this achievement was earned (for weekly achievements)';
COMMENT ON COLUMN user_achievements.sprint_id IS 'Sprint identifier for sprint-based achievements';

COMMENT ON TABLE recognition_metrics IS 'Stores calculated recognition metrics for users across different time periods';
COMMENT ON COLUMN recognition_metrics.metric_name IS 'Name of the metric: weekly_completion_rate, consistency_streak, early_planning_score, etc.';
COMMENT ON COLUMN recognition_metrics.metric_value IS 'Calculated metric value (percentages stored as integers 0-100)';
COMMENT ON COLUMN recognition_metrics.period_start IS 'Start date of the period this metric covers';
COMMENT ON COLUMN recognition_metrics.period_end IS 'End date of the period this metric covers';

COMMENT ON FUNCTION calculate_user_recognition_metrics() IS 'Calculates and updates recognition metrics for all users based on their schedule entries';
COMMENT ON FUNCTION check_user_achievements(INTEGER) IS 'Checks and awards new achievements for a specific user based on their current metrics';
COMMENT ON FUNCTION get_team_recognition_leaderboard(TEXT) IS 'Returns team-wide recognition leaderboard data for specified timeframe (week, month, quarter)';