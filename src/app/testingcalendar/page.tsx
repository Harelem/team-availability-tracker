'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { ArrowLeft, Calendar, Info, TestTube } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { TeamMember, Team } from '@/types';
import { DatabaseService } from '@/lib/database';

// Dynamic import for PersonalCalendar to avoid SSR issues
const PersonalCalendar = dynamic(() => import('@/components/PersonalCalendar'), {
  loading: () => (
    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-gray-600">טוען רכיב לוח שנה...</p>
    </div>
  ),
  ssr: false
});

// Mock user data for testing (this would normally come from auth context)
const MOCK_USER: TeamMember = {
  id: 1,
  name: 'Test User',
  hebrew: 'משתמש בדיקה',
  team_id: 1,
  isManager: false
};

const MOCK_TEAM: Team = {
  id: 1,
  name: 'Test Team',
  description: 'Team for calendar testing'
};

export default function TestingCalendarPage() {
  const [user, setUser] = useState<TeamMember | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<{
    totalEntries: number;
    lastUpdate: string;
  }>({ totalEntries: 0, lastUpdate: 'Never' });

  // Try to fetch real user data, fallback to mock
  useEffect(() => {
    const initializeTestData = async () => {
      try {
        // Try to get real user data (this would typically come from auth context)
        // For now, we'll use mock data
        setUser(MOCK_USER);
        setTeam(MOCK_TEAM);
        
        // Get debug info about schedule entries
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        const data = await DatabaseService.getScheduleEntries(
          startOfMonth.toISOString().split('T')[0],
          endOfMonth.toISOString().split('T')[0]
        );
        
        setDebugInfo({
          totalEntries: Object.keys(data).length || 0,
          lastUpdate: new Date().toLocaleString('he-IL')
        });
        
      } catch (error) {
        console.error('Error initializing test data:', error);
        // Still set mock data even if there's an error
        setUser(MOCK_USER);
        setTeam(MOCK_TEAM);
      } finally {
        setLoading(false);
      }
    };

    initializeTestData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">מתחיל סביבת בדיקה...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>חזרה לדף הבית</span>
            </Link>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <TestTube className="w-8 h-8 text-blue-500" />
                בדיקת רכיב לוח שנה חדש
              </h1>
              <p className="text-gray-600 mt-1">גרסת טסט - Testing Version</p>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="bg-yellow-100 border-r-4 border-yellow-500 p-4 mb-6 rounded-lg shadow-sm">
            <div className="flex items-start gap-3">
              <Info className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800 mb-2">זהו עמוד בדיקה בלבד</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• הטבלה הנוכחית עדיין פעילה ונגישה בדף הבית</li>
                  <li>• רכיב זה מיועד לבדיקה ופיתוח בלבד</li>
                  <li>• נתונים שנשמרים כאן ישפיעו על הטבלה הנוכחית</li>
                  <li>• אם אתה רואה בעיות, אנא דווח עליהן</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Debug Panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              מידע טכני - Debug Info
            </h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>משתמש:</strong> {user?.hebrew || user?.name} (ID: {user?.id})</p>
              <p><strong>צוות:</strong> {team?.name} (ID: {team?.id})</p>
              <p><strong>רשומות בחודש נוכחי:</strong> {debugInfo.totalEntries}</p>
              <p><strong>עדכון אחרון:</strong> {debugInfo.lastUpdate}</p>
              <p><strong>מצב עריכה:</strong> פעיל</p>
            </div>
          </div>

          {/* Feature Testing Checklist */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-green-900 mb-3">רשימת בדיקות - Testing Checklist</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-green-800">ממשק משתמש:</h4>
                <div className="space-y-1 text-green-700">
                  <div>✓ תצוגה חודשית מלאה (6×7)</div>
                  <div>✓ ניווט בין חודשים</div>
                  <div>✓ תמיכה בעברית ו-RTL</div>
                  <div>✓ זיהוי סופי שבוע</div>
                  <div>✓ הדגשת היום הנוכחי</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-green-800">פונקציונליות:</h4>
                <div className="space-y-1 text-green-700">
                  <div>✓ לחיצה על ימים</div>
                  <div>✓ בחירת סיבות</div>
                  <div>✓ שמירה למסד נתונים</div>
                  <div>✓ סינכרון עם הטבלה הקיימת</div>
                  <div>✓ עיצוב רספונסיבי</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Component */}
        <div className="mb-8">
          <Suspense fallback={
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">טוען רכיב לוח שנה...</p>
            </div>
          }>
            {user && team && (
              <PersonalCalendar
                user={user}
                team={team}
                editable={true}
              />
            )}
          </Suspense>
        </div>

        {/* Footer */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-gray-600 text-sm">
            עמוד בדיקה • נוצר ב-{new Date().toLocaleDateString('he-IL')} • 
            <Link href="/" className="text-blue-600 hover:underline ml-2">
              חזרה לטבלה הנוכחית
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}