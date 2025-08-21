'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TeamsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main page as teams selection is the main page
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Redirecting...</h1>
        <p className="text-gray-600">Team selection is available on the main page</p>
      </div>
    </div>
  );
}