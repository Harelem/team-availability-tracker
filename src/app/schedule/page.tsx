'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SchedulePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main page as schedule is handled in the main dashboard
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Redirecting...</h1>
        <p className="text-gray-600">Schedule is available on the main dashboard</p>
      </div>
    </div>
  );
}