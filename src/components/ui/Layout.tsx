/**
 * Enhanced Layout Components
 * 
 * A comprehensive set of layout components including Container, Grid, Stack, 
 * and Flex utilities for consistent spacing and responsive design.
 */

import React, { forwardRef, ReactNode } from 'react';
import { cx } from '@/design-system/theme';

// =============================================================================
// TYPES
// =============================================================================

export type ResponsiveValue<T> = T | { base?: T; sm?: T; md?: T; lg?: T; xl?: T; '2xl'?: T };
export type Spacing = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 56 | 64;
export type JustifyContent = 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
export type AlignItems = 'start' | 'end' | 'center' | 'baseline' | 'stretch';
export type FlexDirection = 'row' | 'col' | 'row-reverse' | 'col-reverse';
export type FlexWrap = 'wrap' | 'nowrap' | 'wrap-reverse';

export interface ContainerProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  centerContent?: boolean;
  className?: string;
  testId?: string;
}

export interface GridProps {
  children: ReactNode;
  cols?: ResponsiveValue<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12>;
  gap?: ResponsiveValue<Spacing>;
  rowGap?: ResponsiveValue<Spacing>;
  colGap?: ResponsiveValue<Spacing>;
  autoRows?: 'auto' | 'min' | 'max' | 'fr';
  autoFlow?: 'row' | 'col' | 'row-dense' | 'col-dense';
  className?: string;
  testId?: string;
}

export interface StackProps {
  children: ReactNode;
  direction?: ResponsiveValue<FlexDirection>;
  spacing?: ResponsiveValue<Spacing>;
  align?: ResponsiveValue<AlignItems>;
  justify?: ResponsiveValue<JustifyContent>;
  wrap?: ResponsiveValue<FlexWrap>;
  divider?: ReactNode;
  className?: string;
  testId?: string;
}

export interface FlexProps {
  children: ReactNode;
  direction?: ResponsiveValue<FlexDirection>;
  wrap?: ResponsiveValue<FlexWrap>;
  align?: ResponsiveValue<AlignItems>;
  justify?: ResponsiveValue<JustifyContent>;
  gap?: ResponsiveValue<Spacing>;
  className?: string;
  testId?: string;
}

export interface SpacerProps {
  size?: Spacing;
  axis?: 'horizontal' | 'vertical' | 'both';
  className?: string;
}

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed' | 'dotted';
  thickness?: 1 | 2 | 4;
  className?: string;
  testId?: string;
}

export interface AspectRatioProps {
  children: ReactNode;
  ratio?: number | `${number}/${number}`;
  className?: string;
  testId?: string;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function getResponsiveClasses<T>(
  value: ResponsiveValue<T> | undefined,
  getClass: (val: T) => string
): string {
  if (!value) return '';
  
  if (typeof value === 'object' && !Array.isArray(value) && 
      ('base' in value || 'sm' in value || 'md' in value || 'lg' in value || 'xl' in value || '2xl' in value)) {
    const classes: string[] = [];
    const responsiveValue = value as { base?: T; sm?: T; md?: T; lg?: T; xl?: T; '2xl'?: T };
    
    if (responsiveValue.base) classes.push(getClass(responsiveValue.base));
    if (responsiveValue.sm) classes.push(`sm:${getClass(responsiveValue.sm)}`);
    if (responsiveValue.md) classes.push(`md:${getClass(responsiveValue.md)}`);
    if (responsiveValue.lg) classes.push(`lg:${getClass(responsiveValue.lg)}`);
    if (responsiveValue.xl) classes.push(`xl:${getClass(responsiveValue.xl)}`);
    if (responsiveValue['2xl']) classes.push(`2xl:${getClass(responsiveValue['2xl'])}`);
    
    return classes.join(' ');
  }
  
  return getClass(value as T);
}

const getSpacingClass = (spacing: Spacing): string => {
  const spacingMap: Record<Spacing, string> = {
    0: '0',
    1: '1',
    2: '2',
    3: '3',
    4: '4',
    5: '5',
    6: '6',
    8: '8',
    10: '10',
    12: '12',
    16: '16',
    20: '20',
    24: '24',
    32: '32',
    40: '40',
    48: '48',
    56: '56',
    64: '64'
  };
  return spacingMap[spacing];
};

// =============================================================================
// CONTAINER COMPONENT
// =============================================================================

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      children,
      size = 'xl',
      centerContent = false,
      className,
      testId,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-4xl',
      xl: 'max-w-6xl',
      full: 'max-w-full'
    };

    const containerClasses = cx(
      'w-full mx-auto px-4 sm:px-6 lg:px-8',
      sizeClasses[size],
      centerContent ? 'flex items-center justify-center' : '',
      className
    );

    return (
      <div
        ref={ref}
        className={containerClasses}
        data-testid={testId}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Container.displayName = 'Container';

// =============================================================================
// GRID COMPONENT
// =============================================================================

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  (
    {
      children,
      cols = 1,
      gap,
      rowGap,
      colGap,
      autoRows = 'auto',
      autoFlow = 'row',
      className,
      testId,
      ...props
    },
    ref
  ) => {
    const colsClasses = getResponsiveClasses(cols, (val) => `grid-cols-${val}`);
    const gapClasses = getResponsiveClasses(gap, (val) => `gap-${getSpacingClass(val)}`);
    const rowGapClasses = getResponsiveClasses(rowGap, (val) => `gap-y-${getSpacingClass(val)}`);
    const colGapClasses = getResponsiveClasses(colGap, (val) => `gap-x-${getSpacingClass(val)}`);

    const autoRowsClasses = {
      auto: 'grid-rows-auto',
      min: 'grid-rows-min',
      max: 'grid-rows-max',
      fr: 'grid-rows-1fr'
    };

    const autoFlowClasses = {
      row: 'grid-flow-row',
      col: 'grid-flow-col',
      'row-dense': 'grid-flow-row-dense',
      'col-dense': 'grid-flow-col-dense'
    };

    const gridClasses = cx(
      'grid',
      colsClasses,
      gapClasses,
      rowGapClasses,
      colGapClasses,
      autoRowsClasses[autoRows],
      autoFlowClasses[autoFlow],
      className
    );

    return (
      <div
        ref={ref}
        className={gridClasses}
        data-testid={testId}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Grid.displayName = 'Grid';

// =============================================================================
// STACK COMPONENT
// =============================================================================

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      children,
      direction = 'col',
      spacing = 4,
      align,
      justify,
      wrap,
      divider,
      className,
      testId,
      ...props
    },
    ref
  ) => {
    const directionClasses = getResponsiveClasses(direction, (val) => `flex-${val}`);
    const spacingClasses = getResponsiveClasses(spacing, (val) => `gap-${getSpacingClass(val)}`);
    const alignClasses = getResponsiveClasses(align, (val) => `items-${val}`);
    const justifyClasses = getResponsiveClasses(justify, (val) => `justify-${val}`);
    const wrapClasses = getResponsiveClasses(wrap, (val) => `flex-${val}`);

    const stackClasses = cx(
      'flex',
      directionClasses,
      spacingClasses,
      alignClasses,
      justifyClasses,
      wrapClasses,
      className
    );

    const childrenArray = React.Children.toArray(children);

    return (
      <div
        ref={ref}
        className={stackClasses}
        data-testid={testId}
        {...props}
      >
        {divider
          ? childrenArray.map((child, index) => (
              <React.Fragment key={index}>
                {child}
                {index < childrenArray.length - 1 && (
                  <div className="flex-shrink-0">{divider}</div>
                )}
              </React.Fragment>
            ))
          : children}
      </div>
    );
  }
);

Stack.displayName = 'Stack';

// =============================================================================
// FLEX COMPONENT
// =============================================================================

export const Flex = forwardRef<HTMLDivElement, FlexProps>(
  (
    {
      children,
      direction = 'row',
      wrap,
      align,
      justify,
      gap,
      className,
      testId,
      ...props
    },
    ref
  ) => {
    const directionClasses = getResponsiveClasses(direction, (val) => `flex-${val}`);
    const wrapClasses = getResponsiveClasses(wrap, (val) => `flex-${val}`);
    const alignClasses = getResponsiveClasses(align, (val) => `items-${val}`);
    const justifyClasses = getResponsiveClasses(justify, (val) => `justify-${val}`);
    const gapClasses = getResponsiveClasses(gap, (val) => `gap-${getSpacingClass(val)}`);

    const flexClasses = cx(
      'flex',
      directionClasses,
      wrapClasses,
      alignClasses,
      justifyClasses,
      gapClasses,
      className
    );

    return (
      <div
        ref={ref}
        className={flexClasses}
        data-testid={testId}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Flex.displayName = 'Flex';

// =============================================================================
// SPACER COMPONENT
// =============================================================================

export const Spacer: React.FC<SpacerProps> = ({
  size = 4,
  axis = 'both',
  className
}) => {
  const sizeClass = getSpacingClass(size);
  
  const spacerClasses = cx(
    (axis === 'horizontal' || axis === 'both') ? `w-${sizeClass}` : '',
    (axis === 'vertical' || axis === 'both') ? `h-${sizeClass}` : '',
    'flex-shrink-0',
    className
  );

  return <div className={spacerClasses} />;
};

// =============================================================================
// DIVIDER COMPONENT
// =============================================================================

export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  (
    {
      orientation = 'horizontal',
      variant = 'solid',
      thickness = 1,
      className,
      testId,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'border-gray-200';
    
    const orientationClasses = {
      horizontal: 'w-full',
      vertical: 'h-full'
    };

    const variantClasses = {
      solid: '',
      dashed: 'border-dashed',
      dotted: 'border-dotted'
    };

    const thicknessClasses = {
      1: orientation === 'horizontal' ? 'border-t' : 'border-l',
      2: orientation === 'horizontal' ? 'border-t-2' : 'border-l-2',
      4: orientation === 'horizontal' ? 'border-t-4' : 'border-l-4'
    };

    const dividerClasses = cx(
      baseClasses,
      orientationClasses[orientation],
      variantClasses[variant],
      thicknessClasses[thickness],
      className
    );

    return (
      <div
        ref={ref}
        className={dividerClasses}
        role="separator"
        aria-orientation={orientation}
        data-testid={testId}
        {...props}
      />
    );
  }
);

Divider.displayName = 'Divider';

// =============================================================================
// ASPECT RATIO COMPONENT
// =============================================================================

export const AspectRatio = forwardRef<HTMLDivElement, AspectRatioProps>(
  (
    {
      children,
      ratio = 16/9,
      className,
      testId,
      ...props
    },
    ref
  ) => {
    const paddingBottom = typeof ratio === 'string' 
      ? (() => {
          const [width, height] = ratio.split('/').map(Number);
          return `${(height / width) * 100}%`;
        })()
      : `${(1 / ratio) * 100}%`;

    return (
      <div
        ref={ref}
        className={cx('relative w-full', className)}
        style={{ paddingBottom }}
        data-testid={testId}
        {...props}
      >
        <div className="absolute inset-0">
          {children}
        </div>
      </div>
    );
  }
);

AspectRatio.displayName = 'AspectRatio';

// =============================================================================
// GRID ITEM COMPONENT
// =============================================================================

export interface GridItemProps {
  children: ReactNode;
  colSpan?: ResponsiveValue<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'full'>;
  rowSpan?: ResponsiveValue<1 | 2 | 3 | 4 | 5 | 6 | 'full'>;
  colStart?: ResponsiveValue<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13>;
  colEnd?: ResponsiveValue<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13>;
  rowStart?: ResponsiveValue<1 | 2 | 3 | 4 | 5 | 6 | 7>;
  rowEnd?: ResponsiveValue<1 | 2 | 3 | 4 | 5 | 6 | 7>;
  className?: string;
  testId?: string;
}

export const GridItem = forwardRef<HTMLDivElement, GridItemProps>(
  (
    {
      children,
      colSpan,
      rowSpan,
      colStart,
      colEnd,
      rowStart,
      rowEnd,
      className,
      testId,
      ...props
    },
    ref
  ) => {
    const colSpanClasses = getResponsiveClasses(colSpan, (val) => `col-span-${val}`);
    const rowSpanClasses = getResponsiveClasses(rowSpan, (val) => `row-span-${val}`);
    const colStartClasses = getResponsiveClasses(colStart, (val) => `col-start-${val}`);
    const colEndClasses = getResponsiveClasses(colEnd, (val) => `col-end-${val}`);
    const rowStartClasses = getResponsiveClasses(rowStart, (val) => `row-start-${val}`);
    const rowEndClasses = getResponsiveClasses(rowEnd, (val) => `row-end-${val}`);

    const gridItemClasses = cx(
      colSpanClasses,
      rowSpanClasses,
      colStartClasses,
      colEndClasses,
      rowStartClasses,
      rowEndClasses,
      className
    );

    return (
      <div
        ref={ref}
        className={gridItemClasses}
        data-testid={testId}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GridItem.displayName = 'GridItem';

// =============================================================================
// CENTER COMPONENT
// =============================================================================

export interface CenterProps {
  children: ReactNode;
  inline?: boolean;
  className?: string;
  testId?: string;
}

export const Center = forwardRef<HTMLDivElement, CenterProps>(
  (
    {
      children,
      inline = false,
      className,
      testId,
      ...props
    },
    ref
  ) => {
    const centerClasses = cx(
      inline ? 'inline-flex' : 'flex',
      'items-center justify-center',
      className
    );

    return (
      <div
        ref={ref}
        className={centerClasses}
        data-testid={testId}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Center.displayName = 'Center';

// =============================================================================
// EXPORTS
// =============================================================================

// Types already exported above

export default {
  Container,
  Grid,
  GridItem,
  Stack,
  Flex,
  Spacer,
  Divider,
  AspectRatio,
  Center
};