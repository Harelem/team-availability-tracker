/**
 * Skip Links Component
 * 
 * Provides keyboard navigation shortcuts to main content areas,
 * helping users quickly navigate to important sections of the page.
 */

'use client';

import React from 'react';

export interface SkipLink {
  href: string;
  label: string;
  description?: string;
}

export interface SkipLinksProps {
  links?: SkipLink[];
  className?: string;
}

// Default skip links for common page sections
const DEFAULT_SKIP_LINKS: SkipLink[] = [
  {
    href: '#main-content',
    label: 'Skip to main content',
    description: 'Jump directly to the main page content'
  },
  {
    href: '#navigation',
    label: 'Skip to navigation',
    description: 'Jump to the main navigation menu'
  },
  {
    href: '#search',
    label: 'Skip to search',
    description: 'Jump to the search functionality'
  }
];

/**
 * Skip Links Component
 * 
 * Renders accessible skip links that appear when focused via keyboard navigation.
 * These links help screen reader users and keyboard-only users navigate efficiently.
 */
const SkipLinks: React.FC<SkipLinksProps> = ({
  links = DEFAULT_SKIP_LINKS,
  className = ''
}) => {
  return (
    <nav 
      className={`skip-links-container ${className}`}
      aria-label="Skip navigation links"
      role="navigation"
    >
      {links.map((link, index) => (
        <a
          key={`${link.href}-${index}`}
          href={link.href}
          className="skip-link"
          data-skip-link="true"
          aria-describedby={link.description ? `skip-desc-${index}` : undefined}
          onFocus={(e) => {
            // Announce to screen readers when skip link is focused
            const announcement = `Skip link: ${link.label}`;
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              // Optional: Use speech synthesis for additional feedback
            }
          }}
        >
          {link.label}
          {link.description && (
            <span 
              id={`skip-desc-${index}`}
              className="sr-only"
            >
              {link.description}
            </span>
          )}
        </a>
      ))}
    </nav>
  );
};

/**
 * Hook to register skip link targets
 * 
 * This hook helps components register themselves as skip link targets,
 * ensuring the links actually work when activated.
 */
export function useSkipLinkTarget(targetId: string) {
  React.useEffect(() => {
    const element = document.getElementById(targetId);
    if (element) {
      // Ensure the element can receive focus
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '-1');
      }
      
      // Handle skip link navigation
      const handleSkipLinkFocus = (event: Event) => {
        if (event.target === element) {
          // Scroll element into view smoothly
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
          
          // Brief visual indication for sighted users
          element.style.outline = '2px solid #3b82f6';
          element.style.outlineOffset = '2px';
          
          setTimeout(() => {
            element.style.outline = '';
            element.style.outlineOffset = '';
          }, 2000);
        }
      };
      
      element.addEventListener('focus', handleSkipLinkFocus);
      
      return () => {
        element.removeEventListener('focus', handleSkipLinkFocus);
      };
    }
  }, [targetId]);
}

/**
 * Skip to Content Button Component
 * 
 * A utility component that can be placed anywhere to provide skip functionality.
 */
export const SkipToContentButton: React.FC<{
  targetId: string;
  children: React.ReactNode;
  className?: string;
}> = ({ targetId, children, className = '' }) => {
  const handleSkip = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleSkip(event);
    }
  };

  return (
    <button
      className={`skip-to-content-button ${className}`}
      onClick={handleSkip}
      onKeyDown={handleKeyDown}
      aria-describedby={`skip-desc-${targetId}`}
    >
      {children}
      <span id={`skip-desc-${targetId}`} className="sr-only">
        Skip to {targetId.replace(/-/g, ' ')} section
      </span>
    </button>
  );
};

export default SkipLinks;