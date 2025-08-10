/**
 * Enhanced Table Component
 * 
 * A comprehensive table component with support for different variants, sizes,
 * sorting, selection, and full accessibility features.
 */

import React, { forwardRef, ReactNode, useState, useCallback } from 'react';
import { cx } from '@/design-system/theme';
import { TableVariant, TableSize } from '@/design-system/variants';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  variant?: TableVariant;
  size?: TableSize;
  className?: string;
  testId?: string;
}

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
  className?: string;
}

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
  className?: string;
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode;
  selected?: boolean;
  clickable?: boolean;
  className?: string;
}

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
  className?: string;
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  className?: string;
}

export interface TableCaptionProps {
  children: ReactNode;
  className?: string;
}

// =============================================================================
// TABLE COMPONENT
// =============================================================================

export const Table = forwardRef<HTMLTableElement, TableProps>(
  (
    {
      children,
      variant = 'simple',
      size = 'md',
      className,
      testId,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseClasses = cx(
      'w-full border-collapse bg-white'
    );

    // Variant styles
    const variantClasses = {
      simple: '',
      striped: '[&_tbody_tr:nth-child(even)]:bg-gray-50',
      bordered: cx(
        'border border-gray-200',
        '[&_th]:border [&_th]:border-gray-200',
        '[&_td]:border [&_td]:border-gray-200'
      )
    };

    // Size styles
    const sizeClasses = {
      sm: '[&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 [&_th]:text-sm [&_td]:text-sm',
      md: '[&_th]:px-4 [&_th]:py-3 [&_td]:px-4 [&_td]:py-3 [&_th]:text-base [&_td]:text-base',
      lg: '[&_th]:px-6 [&_th]:py-4 [&_td]:px-6 [&_td]:py-4 [&_th]:text-lg [&_td]:text-lg'
    };

    const tableClasses = cx(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className
    );

    return (
      <div className="overflow-auto">
        <table
          ref={ref}
          className={tableClasses}
          data-testid={testId}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);

Table.displayName = 'Table';

// =============================================================================
// TABLE CAPTION
// =============================================================================

export const TableCaption: React.FC<TableCaptionProps> = ({ 
  children, 
  className 
}) => {
  return (
    <caption className={cx('mt-4 text-sm text-gray-500', className)}>
      {children}
    </caption>
  );
};

// =============================================================================
// TABLE HEADER
// =============================================================================

export const TableHeader: React.FC<TableHeaderProps> = ({ 
  children, 
  className,
  ...props
}) => {
  return (
    <thead className={cx('bg-gray-50', className)} {...props}>
      {children}
    </thead>
  );
};

// =============================================================================
// TABLE BODY
// =============================================================================

export const TableBody: React.FC<TableBodyProps> = ({ 
  children, 
  className,
  ...props
}) => {
  return (
    <tbody className={cx('divide-y divide-gray-200', className)} {...props}>
      {children}
    </tbody>
  );
};

// =============================================================================
// TABLE ROW
// =============================================================================

export const TableRow: React.FC<TableRowProps> = ({ 
  children, 
  selected = false,
  clickable = false,
  className,
  ...props
}) => {
  const rowClasses = cx(
    'transition-colors duration-200',
    selected ? 'bg-blue-50 hover:bg-blue-100' : '',
    (clickable && !selected) ? 'hover:bg-gray-50' : '',
    clickable ? 'cursor-pointer' : '',
    className
  );

  return (
    <tr className={rowClasses} {...props}>
      {children}
    </tr>
  );
};

// =============================================================================
// TABLE HEAD CELL
// =============================================================================

export const TableHead: React.FC<TableHeadProps> = ({ 
  children, 
  sortable = false,
  sortDirection = null,
  onSort,
  className,
  ...props
}) => {
  const headClasses = cx(
    'text-left font-semibold text-gray-900 tracking-wider uppercase',
    sortable ? 'cursor-pointer select-none hover:bg-gray-100 transition-colors duration-200' : '',
    className
  );

  const getSortIcon = () => {
    if (!sortable) return null;
    
    if (sortDirection === 'asc') {
      return <ChevronUp className="w-4 h-4" />;
    } else if (sortDirection === 'desc') {
      return <ChevronDown className="w-4 h-4" />;
    } else {
      return <ChevronsUpDown className="w-4 h-4 opacity-50" />;
    }
  };

  const content = sortable ? (
    <div className="flex items-center gap-1">
      <span>{children}</span>
      {getSortIcon()}
    </div>
  ) : children;

  return (
    <th 
      className={headClasses}
      onClick={sortable ? onSort : undefined}
      role={sortable ? 'button' : undefined}
      tabIndex={sortable ? 0 : undefined}
      aria-sort={
        sortDirection === 'asc' ? 'ascending' : 
        sortDirection === 'desc' ? 'descending' : 
        sortable ? 'none' : undefined
      }
      onKeyDown={sortable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSort?.();
        }
      } : undefined}
      {...props}
    >
      {content}
    </th>
  );
};

// =============================================================================
// TABLE CELL
// =============================================================================

export const TableCell: React.FC<TableCellProps> = ({ 
  children, 
  className,
  ...props
}) => {
  return (
    <td className={cx('text-gray-900', className)} {...props}>
      {children}
    </td>
  );
};

// =============================================================================
// TABLE UTILITIES
// =============================================================================

export interface UseSortableTableReturn<T> {
  sortedData: T[];
  sortKey: keyof T | null;
  sortDirection: 'asc' | 'desc' | null;
  handleSort: (key: keyof T) => void;
  getSortProps: (key: keyof T) => {
    sortable: boolean;
    sortDirection: 'asc' | 'desc' | null;
    onSort: () => void;
  };
}

export const useSortableTable = <T extends Record<string, any>>(
  data: T[],
  defaultSortKey?: keyof T,
  defaultSortDirection: 'asc' | 'desc' = 'asc'
): UseSortableTableReturn<T> => {
  const [sortKey, setSortKey] = useState<keyof T | null>(defaultSortKey || null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(
    defaultSortKey ? defaultSortDirection : null
  );

  const handleSort = useCallback((key: keyof T) => {
    if (sortKey === key) {
      // Cycle through: asc -> desc -> null -> asc
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortKey(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }, [sortKey, sortDirection]);

  const sortedData = React.useMemo(() => {
    if (!sortKey || !sortDirection) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue === bValue) return 0;

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [data, sortKey, sortDirection]);

  const getSortProps = useCallback((key: keyof T) => ({
    sortable: true,
    sortDirection: sortKey === key ? sortDirection : null,
    onSort: () => handleSort(key)
  }), [sortKey, sortDirection, handleSort]);

  return {
    sortedData,
    sortKey,
    sortDirection,
    handleSort,
    getSortProps
  };
};

// =============================================================================
// EXPORTS
// =============================================================================

export type { TableVariant, TableSize };
export default Table;