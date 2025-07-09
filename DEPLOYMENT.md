# Team Availability Tracker

A real-time team availability tracking application built with Next.js, Supabase, and TypeScript.

## Features

- **User Authentication**: Team member selection system
- **Schedule Management**: Interactive weekly schedule (Sunday-Thursday)
- **Work Options**: Full day (7h), Half day (3.5h), Sick/Absent (0h)
- **Permission System**: Users can only edit their own schedules, managers can edit all
- **Real-time Sync**: Changes are automatically synced across all devices
- **Excel Export**: Manager-only feature to export schedules
- **Reason Tracking**: Required explanations for half days and absences
- **Responsive Design**: Mobile-first design that works on all devices

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Export**: XLSX for Excel export
- **Deployment**: Vercel

## Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd team-availability-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Copy `.env.local` and update with your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

4. **Set up Supabase database**
   - Create a new Supabase project
   - Run the SQL from `sql/schema.sql` in the Supabase SQL editor
   - This will create the required tables and initial data

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Visit [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

1. **Fork/Clone this repository**

2. **Create a Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Go to Project Settings → API
   - Copy the Project URL and anon public key

3. **Set up the database**
   - Go to the SQL Editor in Supabase
   - Copy and run the SQL from `sql/schema.sql`
   - This creates the tables and inserts the team members

4. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Set the environment variables in Vercel:
     - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - Deploy the project

5. **Test the deployment**
   - Visit your deployed URL
   - Select a team member and test the functionality
   - Test real-time sync by opening the app in multiple tabs

## Database Schema

### team_members
- `id`: Primary key
- `name`: Full name (English)
- `hebrew`: Hebrew name
- `is_manager`: Boolean flag for manager permissions
- `email`: Optional email address
- `created_at`, `updated_at`: Timestamps

### schedule_entries
- `id`: Primary key
- `member_id`: Foreign key to team_members
- `date`: Date of the schedule entry
- `value`: Work status ('1', '0.5', or 'X')
- `reason`: Optional reason for half day or absence
- `created_at`, `updated_at`: Timestamps

## Team Members

The application is configured for the following team members:

1. **Natan Shemesh** (נתן שמש)
2. **Ido Keller** (עידו קלר)
3. **Amit Zriker** (עמית צריקר) - Manager
4. **Alon Mesika** (אלון מסיקה)
5. **Nadav Aharon** (נדב אהרון)
6. **Yarom Kloss** (ירום קלוס)
7. **Ziv Edelstein** (זיב אדלשטיין)
8. **Harel Mazan** (הראל מזן) - Manager

## Usage

1. **Login**: Select your name from the team member list
2. **Schedule**: Click on the work option buttons (1, 0.5, X) for each day
3. **Reasons**: For half days and absences, provide a reason in the popup
4. **Navigation**: Use Previous/Next buttons to navigate between weeks
5. **Export**: Managers can export schedules to Excel
6. **Real-time**: Changes are automatically synced across all devices

## Manager Features

Managers (Amit Zriker and Harel Mazan) have additional privileges:
- Edit anyone's schedule
- View all team member reasons
- Export schedules to Excel
- Full visibility into team availability

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private and intended for internal team use only.