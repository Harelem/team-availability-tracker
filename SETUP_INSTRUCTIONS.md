# Team Availability Tracker - Setup Instructions

## ✅ Phase 1 Complete
Your Team Availability Tracker is fully working at **http://localhost:3000**

### What's Working:
- Clean login screen with team member selection
- Complete schedule table (Sunday-Thursday)
- Interactive work options (1=7h, 0.5=3.5h, X=0h)
- Permission system (users edit own, managers edit all)
- Week navigation with Previous/Next/Current buttons
- Real-time hour calculations and team totals
- Reason dialog system for half days and absences
- Manager features (Excel export, view all reasons)
- Responsive mobile design
- Proper TypeScript interfaces

## 🚀 Phase 2 Ready - Production Deployment

### Database Setup (Required for Production)
1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create account
   - Create new project
   - Go to Project Settings → API
   - Copy Project URL and anon public key

2. **Set up Database**
   - Go to SQL Editor in Supabase
   - Copy and paste SQL from `sql/schema.sql`
   - Execute the script (creates tables and inserts team members)

### Environment Configuration
Update `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_actual_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_supabase_anon_key_here
```

### Vercel Deployment
1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Complete Team Availability Tracker"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com) and import your repository
   - Set environment variables in Vercel dashboard:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Deploy

### Testing Real-time Collaboration
1. Open the deployed app in multiple browser tabs
2. Select different team members
3. Make schedule changes and watch them sync in real-time
4. Test manager features (Excel export, view reasons)

## 👥 Team Members Configured
- **Natan Shemesh** (נתן שמש)
- **Ido Keller** (עידו קלר)
- **Amit Zriker** (עמית צריקר) - Manager
- **Alon Mesika** (אלון מסיקה)
- **Nadav Aharon** (נדב אהרון)
- **Yarom Kloss** (ירום קלוס)
- **Ziv Edelstein** (זיב אדלשטיין)
- **Harel Mazan** (הראל מזן) - Manager

## 📁 Project Structure
```
team-availability-tracker/
├── src/
│   ├── app/
│   │   ├── page.tsx (Main app with user selection)
│   │   ├── layout.tsx (App layout)
│   │   └── globals.css (Tailwind styles)
│   ├── components/
│   │   ├── ScheduleTable.tsx (Main schedule component)
│   │   ├── ReasonDialog.tsx (Reason input modal)
│   │   └── ViewReasonsModal.tsx (Manager view reasons)
│   ├── lib/
│   │   ├── supabase.ts (Supabase client)
│   │   └── database.ts (Database operations)
│   └── types/
│       └── index.ts (TypeScript interfaces)
├── sql/
│   └── schema.sql (Database schema)
├── .env.local (Environment variables)
├── vercel.json (Vercel configuration)
└── DEPLOYMENT.md (Deployment guide)
```

## 🔧 Key Features
- **Real-time Sync**: Changes instantly appear across all devices
- **Offline Fallback**: Works locally without database
- **Excel Export**: Manager-only Excel export functionality
- **Reason Tracking**: Required explanations for half days/absences
- **Mobile Responsive**: Works perfectly on all devices
- **TypeScript**: Fully typed for better development experience

## 🎯 Next Steps
1. Set up Supabase database using `sql/schema.sql`
2. Update environment variables with real Supabase credentials
3. Deploy to Vercel
4. Test real-time collaboration
5. Share the deployment URL with your team

The app is ready for production use! 🚀