/**
 * OPTIMIZED: Minimal loader component to reduce critical bundle size
 * Used for lazy loading fallbacks to avoid blocking TTI
 */
export default function MinimalLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-pulse flex items-center gap-2">
        <div className="bg-gray-200 rounded w-4 h-4"></div>
        <span className="text-gray-600">{text}</span>
      </div>
    </div>
  );
}