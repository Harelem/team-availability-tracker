/**
 * Design System Migration Utilities
 * 
 * Helper functions and utilities to assist with migrating components
 * to use the new design system.
 */

// =============================================================================
// CLASS NAME MAPPINGS
// =============================================================================

export const buttonClassMappings = {
  // Size mappings
  'h-6 px-2 text-xs': 'size="xs"',
  'h-8 px-3 text-sm': 'size="sm"',
  'h-10 px-4 text-base': 'size="md"',
  'h-12 px-6 text-lg': 'size="lg"',
  'h-14 px-8 text-xl': 'size="xl"',
  
  // Variant mappings
  'bg-blue-600 text-white': 'variant="primary"',
  'bg-gray-100 text-gray-900': 'variant="secondary"',
  'border border-blue-600 text-blue-600': 'variant="outline"',
  'text-blue-600 hover:underline': 'variant="link"',
  'hover:bg-gray-100': 'variant="ghost"',
  'bg-green-600 text-white': 'variant="success"',
  'bg-yellow-600 text-white': 'variant="warning"',
  'bg-red-600 text-white': 'variant="error"',
} as const;

export const cardClassMappings = {
  // Variant mappings
  'bg-white shadow-sm border': 'variant="default"',
  'bg-white shadow-md border': 'variant="elevated"',
  'bg-white border-2 shadow-none': 'variant="outlined"',
  'bg-gray-50 border-transparent': 'variant="filled"',
  'bg-green-50 border-green-200': 'variant="success"',
  'bg-yellow-50 border-yellow-200': 'variant="warning"',
  'bg-red-50 border-red-200': 'variant="error"',
  'bg-blue-50 border-blue-200': 'variant="info"',
  
  // Interactive
  'cursor-pointer hover:shadow-md': 'interactive={true}',
} as const;

export const inputClassMappings = {
  // Size mappings
  'h-8 px-3 text-sm': 'size="sm"',
  'h-10 px-4 text-base': 'size="md"',
  'h-12 px-5 text-lg': 'size="lg"',
  
  // Variant mappings
  'bg-white border-gray-300': 'variant="default"',
  'bg-gray-50 border-transparent': 'variant="filled"',
  'border-0 border-b-2': 'variant="flushed"',
  
  // State mappings
  'border-red-500': 'error={true}',
  'border-green-500': 'success={true}',
} as const;

export const badgeClassMappings = {
  // Variant mappings
  'bg-blue-100 text-blue-800': 'variant="primary"',
  'bg-gray-100 text-gray-800': 'variant="secondary"',
  'bg-green-100 text-green-800': 'variant="success"',
  'bg-yellow-100 text-yellow-800': 'variant="warning"',
  'bg-red-100 text-red-800': 'variant="error"',
  'bg-cyan-100 text-cyan-800': 'variant="info"',
  'bg-transparent border': 'variant="outline"',
  
  // Size mappings
  'px-2 py-0.5 text-xs': 'size="sm"',
  'px-2.5 py-1 text-xs': 'size="md"',
  'px-3 py-1.5 text-sm': 'size="lg"',
} as const;

// =============================================================================
// MIGRATION HELPERS
// =============================================================================

export interface MigrationSuggestion {
  element: string;
  oldClasses: string;
  newProps: string;
  component: string;
  confidence: 'high' | 'medium' | 'low';
}

export const analyzeBuildSystemUsage = (htmlString: string): MigrationSuggestion[] => {
  const suggestions: MigrationSuggestion[] = [];
  
  // Button analysis
  const buttonRegex = /<button[^>]*class="([^"]*)"[^>]*>/g;
  let match;
  
  while ((match = buttonRegex.exec(htmlString)) !== null) {
    const classes = match[1];
    
    for (const [classPattern, newProps] of Object.entries(buttonClassMappings)) {
      if (classes.includes(classPattern)) {
        suggestions.push({
          element: 'button',
          oldClasses: classPattern,
          newProps,
          component: 'Button',
          confidence: 'high'
        });
      }
    }
  }
  
  // Card analysis
  const cardRegex = /<div[^>]*class="([^"]*)"[^>]*>/g;
  
  while ((match = cardRegex.exec(htmlString)) !== null) {
    const classes = match[1];
    
    if (classes.includes('rounded') && classes.includes('shadow')) {
      for (const [classPattern, newProps] of Object.entries(cardClassMappings)) {
        if (classes.includes(classPattern.split(' ')[0])) {
          suggestions.push({
            element: 'div',
            oldClasses: classPattern,
            newProps,
            component: 'Card',
            confidence: 'medium'
          });
        }
      }
    }
  }
  
  return suggestions;
};

export const generateMigrationReport = (suggestions: MigrationSuggestion[]): string => {
  const grouped = suggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.component]) {
      acc[suggestion.component] = [];
    }
    acc[suggestion.component].push(suggestion);
    return acc;
  }, {} as Record<string, MigrationSuggestion[]>);
  
  let report = '# Migration Report\n\n';
  
  for (const [component, items] of Object.entries(grouped)) {
    report += `## ${component} Component\n\n`;
    
    items.forEach((item, index) => {
      report += `### Migration ${index + 1} (${item.confidence} confidence)\n`;
      report += `**From:** \`${item.oldClasses}\`\n`;
      report += `**To:** \`${item.newProps}\`\n\n`;
      report += '```tsx\n';
      report += `// Before\n<${item.element} className="${item.oldClasses}" />\n\n`;
      report += `// After\n<${component} ${item.newProps} />\n`;
      report += '```\n\n';
    });
  }
  
  return report;
};

// =============================================================================
// COMPONENT DETECTION
// =============================================================================

export const detectComponentPatterns = (codeString: string): Record<string, number> => {
  const patterns = {
    // HTML patterns that could be components
    manualButtons: (codeString.match(/<button[^>]*className="[^"]*bg-(blue|gray|green|red|yellow)-\d+/g) || []).length,
    manualCards: (codeString.match(/<div[^>]*className="[^"]*bg-white[^"]*shadow[^"]*rounded/g) || []).length,
    manualInputs: (codeString.match(/<input[^>]*className="[^"]*border[^"]*rounded/g) || []).length,
    manualModals: (codeString.match(/fixed inset-0.*bg-black.*bg-opacity-50/g) || []).length,
    manualSpacing: (codeString.match(/space-[xy]-\d+/g) || []).length,
    manualFlex: (codeString.match(/flex.*items-\w+.*justify-\w+/g) || []).length,
    manualGrid: (codeString.match(/grid.*grid-cols-\d+/g) || []).length,
    
    // Loading states
    manualLoading: (codeString.match(/animate-pulse/g) || []).length,
    manualSpinner: (codeString.match(/animate-spin/g) || []).length,
    
    // Form patterns
    manualForms: (codeString.match(/<label[^>]*>.*<input/g) || []).length,
    manualValidation: (codeString.match(/text-red-\d+.*error/gi) || []).length,
  };
  
  return patterns;
};

// =============================================================================
// MIGRATION PRIORITY
// =============================================================================

export const calculateMigrationPriority = (patterns: Record<string, number>): Array<{
  category: string;
  count: number;
  priority: 'high' | 'medium' | 'low';
  impact: string;
}> => {
  return [
    {
      category: 'Layout & Spacing',
      count: patterns.manualSpacing + patterns.manualFlex + patterns.manualGrid,
      priority: 'high',
      impact: 'Foundation for responsive design and consistent spacing'
    },
    {
      category: 'Buttons',
      count: patterns.manualButtons,
      priority: 'high',
      impact: 'High user interaction, accessibility improvements'
    },
    {
      category: 'Cards',
      count: patterns.manualCards,
      priority: 'medium',
      impact: 'Visual consistency and interactive states'
    },
    {
      category: 'Forms',
      count: patterns.manualForms + patterns.manualValidation + patterns.manualInputs,
      priority: 'high',
      impact: 'Better validation, accessibility, and user experience'
    },
    {
      category: 'Loading States',
      count: patterns.manualLoading + patterns.manualSpinner,
      priority: 'medium',
      impact: 'Consistent loading experiences'
    },
    {
      category: 'Modals',
      count: patterns.manualModals,
      priority: 'medium',
      impact: 'Focus management and accessibility'
    }
  ].sort((a, b) => b.count - a.count);
};

// =============================================================================
// AUTOMATED REPLACEMENTS
// =============================================================================

export const applyBasicReplacements = (code: string): string => {
  let updatedCode = code;
  
  // Replace common button patterns
  updatedCode = updatedCode.replace(
    /<button([^>]*)className="([^"]*bg-blue-600[^"]*)"([^>]*)>/g,
    '<Button$1variant="primary"$3>'
  );
  
  updatedCode = updatedCode.replace(
    /<button([^>]*)className="([^"]*bg-gray-100[^"]*)"([^>]*)>/g,
    '<Button$1variant="secondary"$3>'
  );
  
  // Replace common spacing patterns
  updatedCode = updatedCode.replace(
    /className="([^"]*space-y-(\d+)[^"]*)"/g,
    (match, fullClass, spacing) => {
      const spacingMap: Record<string, string> = {
        '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '8': '8'
      };
      return `spacing={${spacingMap[spacing] || spacing}}`;
    }
  );
  
  // Replace flex patterns
  updatedCode = updatedCode.replace(
    /className="([^"]*flex[^"]*items-center[^"]*justify-between[^"]*)"([^>]*>)/g,
    'justify="between" align="center"$2'
  );
  
  return updatedCode;
};

// =============================================================================
// VALIDATION
// =============================================================================

export const validateMigration = (originalCode: string, migratedCode: string): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} => {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Check for common migration issues
  if (migratedCode.includes('className=') && migratedCode.includes('variant=')) {
    warnings.push('Found both className and variant props - consider consolidating');
  }
  
  if (originalCode.includes('disabled') && !migratedCode.includes('disabled')) {
    warnings.push('Original code had disabled state - ensure it\'s preserved');
  }
  
  if (originalCode.includes('onClick') && !migratedCode.includes('onClick')) {
    warnings.push('Original code had click handler - ensure it\'s preserved');
  }
  
  // Suggestions
  if (migratedCode.includes('<div') && migratedCode.includes('flex')) {
    suggestions.push('Consider using <Flex> or <Stack> components for layout');
  }
  
  if (migratedCode.includes('animate-pulse')) {
    suggestions.push('Consider using <Loading> or <Skeleton> components');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions
  };
};

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  analyzeBuildSystemUsage,
  generateMigrationReport,
  detectComponentPatterns,
  calculateMigrationPriority,
  applyBasicReplacements,
  validateMigration
};