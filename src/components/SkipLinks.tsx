/**
 * Skip Links Component - Hydration Safe
 * Ensures consistent accessibility skip navigation
 * Prevents React hydration mismatches by removing client-side state
 */

interface SkipLinksProps {
  className?: string;
}

export default function SkipLinks({ className = "skip-links-container" }: SkipLinksProps) {
  // Simple static rendering - no client-side state to prevent hydration issues
  return (
    <div className={className}>
      <a 
        href="#main-content" 
        className="skip-link"
        data-skip-link="true"
        tabIndex={1}
      >
        Skip to main content
      </a>
      <a 
        href="#navigation" 
        className="skip-link"
        tabIndex={2}
      >
        Skip to navigation
      </a>
    </div>
  );
}