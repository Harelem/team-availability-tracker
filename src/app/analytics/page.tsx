'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AnalyticsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to executive dashboard where analytics are available
    router.replace('/executive');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Redirecting...</h1>
        <p className="text-gray-600">Analytics are available on the executive dashboard</p>
      </div>
    </div>
  );
}