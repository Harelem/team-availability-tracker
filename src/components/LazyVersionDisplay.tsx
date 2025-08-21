'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load the VersionDisplay component with performance optimizations
const VersionDisplayLazy = dynamic(
  () => import('./VersionDisplay'),
  {
    loading: () => null, // No loading spinner needed for floating button
    ssr: false, // Client-side only for better performance and Hebrew content
  }
);

/**
 * Performance-optimized lazy wrapper for VersionDisplay
 * This component implements lazy loading to reduce initial bundle size
 * and improve page load performance
 */
export default function LazyVersionDisplay() {
  return (
    <Suspense fallback={null}>
      <VersionDisplayLazy />
    </Suspense>
  );
}