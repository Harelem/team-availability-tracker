#!/bin/bash

# Deploy Daily Company Status Database Fixes
# This script applies the database enhancements to fix getDailyCompanyStatus functionality

set -e

echo "🔧 Deploying Daily Company Status Database Fixes..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local file not found${NC}"
    echo "Please create .env.local with your Supabase credentials"
    exit 1
fi

# Load environment variables
source .env.local

# Check required variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env.local${NC}"
    exit 1
fi

echo -e "${YELLOW}Applying database enhancements...${NC}"

# Apply the database enhancement script
if [ -f "sql/enhance-daily-company-status.sql" ]; then
    echo "📄 Applying enhance-daily-company-status.sql..."
    
    # Note: In a real deployment, you would use Supabase CLI or direct database connection
    # For now, we'll provide instructions
    echo -e "${YELLOW}MANUAL STEP REQUIRED:${NC}"
    echo "Please run the following SQL script in your Supabase SQL editor:"
    echo "File: sql/enhance-daily-company-status.sql"
    echo ""
    echo "This script will:"
    echo "✅ Add role and is_critical columns to team_members table"
    echo "✅ Add inactive_date column to team_members table"
    echo "✅ Create indexes for improved performance"
    echo "✅ Create helper functions for value-to-hours conversion"
    echo "✅ Create views for unified data access"
    echo "✅ Add validation and error handling functions"
    echo ""
    
    # Validation queries
    echo -e "${GREEN}After running the SQL script, you can validate with these queries:${NC}"
    echo ""
    echo "-- Check if new columns exist:"
    echo "SELECT column_name FROM information_schema.columns WHERE table_name = 'team_members' AND column_name IN ('role', 'is_critical', 'inactive_date');"
    echo ""
    echo "-- Validate data integrity:"
    echo "SELECT * FROM validate_daily_status_data();"
    echo ""
    echo "-- Populate default values:"
    echo "SELECT populate_default_member_data();"
    echo ""
    echo "-- Test summary function:"
    echo "SELECT * FROM get_daily_status_summary();"
    echo ""
    
else
    echo -e "${RED}Error: sql/enhance-daily-company-status.sql not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database enhancement script prepared${NC}"
echo -e "${GREEN}✅ Code fixes applied to getDailyCompanyStatus function${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Apply the SQL script in Supabase SQL editor"
echo "2. Run the validation queries to check data integrity"
echo "3. Test the getDailyCompanyStatus function in your application"
echo ""
echo "🎉 Deployment preparation complete!"