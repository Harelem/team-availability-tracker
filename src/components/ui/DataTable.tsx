/**
 * Enhanced DataTable Component
 * 
 * A comprehensive data table with sorting, filtering, pagination, and selection.
 * Built on top of our Table component with advanced functionality.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { cx } from '@/design-system/theme';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell,
  TableVariant,
  TableSize,
  useSortableTable 
} from './Table';
import { Input } from './Input';
import { Button } from './button';
import { Loading } from './Loading';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter,
  Download,
  MoreHorizontal 
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface DataTableColumn<T = any> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: DataTableColumn<T>[];
  variant?: TableVariant;
  size?: TableSize;
  loading?: boolean;
  selectable?: boolean;
  selectedRows?: Set<number>;
  onSelectionChange?: (selectedRows: Set<number>) => void;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filterable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  actions?: React.ReactNode;
  emptyMessage?: string;
  className?: string;
  testId?: string;
}

export interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

export interface UseDataTableReturn<T> {
  filteredData: T[];
  paginatedData: T[];
  selectedRows: Set<number>;
  searchValue: string;
  currentPage: number;
  totalPages: number;
  setSearchValue: (value: string) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  toggleRowSelection: (index: number) => void;
  selectAllRows: () => void;
  clearSelection: () => void;
  isRowSelected: (index: number) => boolean;
  isAllSelected: boolean;
  isSomeSelected: boolean;
}

// =============================================================================
// DATA TABLE COMPONENT
// =============================================================================

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  variant = 'simple',
  size = 'md',
  loading = false,
  selectable = false,
  selectedRows,
  onSelectionChange,
  searchable = false,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterable = false,
  pagination = false,
  pageSize = 10,
  currentPage = 1,
  totalPages,
  onPageChange,
  onPageSizeChange,
  actions,
  emptyMessage = 'No data available',
  className,
  testId
}: DataTableProps<T>) {
  // Internal state for uncontrolled mode
  const [internalSearch, setInternalSearch] = useState('');
  const [internalPage, setInternalPage] = useState(1);
  const [internalSelected, setInternalSelected] = useState<Set<number>>(new Set());

  // Use provided values or fallback to internal state
  const search = searchValue !== undefined ? searchValue : internalSearch;
  const page = currentPage !== undefined ? currentPage : internalPage;
  const selected = selectedRows !== undefined ? selectedRows : internalSelected;

  // Sortable table hook
  const { sortedData, getSortProps } = useSortableTable(data);

  // Search filtering
  const searchFilteredData = useMemo(() => {
    if (!search) return sortedData;
    
    const searchLower = search.toLowerCase();
    return sortedData.filter((row) => {
      return columns.some((column) => {
        if (!column.filterable) return false;
        const value = row[column.key];
        return String(value).toLowerCase().includes(searchLower);
      });
    });
  }, [sortedData, search, columns]);

  // Pagination
  const totalItems = searchFilteredData.length;
  const calculatedTotalPages = totalPages || Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = pagination ? searchFilteredData.slice(startIndex, endIndex) : searchFilteredData;

  // Selection handlers
  const handleSearchChange = useCallback((value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setInternalSearch(value);
    }
  }, [onSearchChange]);

  const handlePageChange = useCallback((newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  }, [onPageChange]);

  const toggleRowSelection = useCallback((index: number) => {
    const actualIndex = pagination ? startIndex + index : index;
    const newSelected = new Set(selected);
    
    if (newSelected.has(actualIndex)) {
      newSelected.delete(actualIndex);
    } else {
      newSelected.add(actualIndex);
    }
    
    if (onSelectionChange) {
      onSelectionChange(newSelected);
    } else {
      setInternalSelected(newSelected);
    }
  }, [selected, onSelectionChange, pagination, startIndex]);

  const selectAllRows = useCallback(() => {
    const newSelected = new Set<number>();
    paginatedData.forEach((_, index) => {
      newSelected.add(pagination ? startIndex + index : index);
    });
    
    if (onSelectionChange) {
      onSelectionChange(newSelected);
    } else {
      setInternalSelected(newSelected);
    }
  }, [paginatedData, onSelectionChange, pagination, startIndex]);

  const clearSelection = useCallback(() => {
    const newSelected = new Set<number>();
    if (onSelectionChange) {
      onSelectionChange(newSelected);
    } else {
      setInternalSelected(newSelected);
    }
  }, [onSelectionChange]);

  // Selection state
  const visibleRowIndices = paginatedData.map((_, index) => pagination ? startIndex + index : index);
  const isAllVisibleSelected = visibleRowIndices.length > 0 && visibleRowIndices.every(index => selected.has(index));
  const isSomeVisibleSelected = visibleRowIndices.some(index => selected.has(index));

  const handleSelectAllChange = () => {
    if (isAllVisibleSelected) {
      // Deselect all visible rows
      const newSelected = new Set(selected);
      visibleRowIndices.forEach(index => newSelected.delete(index));
      
      if (onSelectionChange) {
        onSelectionChange(newSelected);
      } else {
        setInternalSelected(newSelected);
      }
    } else {
      selectAllRows();
    }
  };

  return (
    <div className={cx('space-y-4', className)} data-testid={testId}>
      {/* Header with search and actions */}
      {(searchable || filterable || actions) && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {searchable && (
              <div className="relative">
                <Input
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                  className="w-64"
                />
              </div>
            )}
            
            {filterable && (
              <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>
                Filter
              </Button>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Selection summary */}
      {selectable && selected.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-800">
            {selected.size} item{selected.size === 1 ? '' : 's'} selected
          </span>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Clear selection
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <Table variant={variant} size={size}>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = !isAllVisibleSelected && isSomeVisibleSelected;
                    }}
                    onChange={handleSelectAllChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </TableHead>
              )}
              
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  {...(column.sortable ? getSortProps(column.key) : {})}
                  className={cx(
                    (column.align === 'left' || !column.align) ? 'text-left' : '',
                    column.align === 'center' ? 'text-center' : '',
                    column.align === 'right' ? 'text-right' : '',
                    column.className
                  )}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)}>
                  <div className="flex items-center justify-center py-8">
                    <Loading size="lg" />
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading && paginatedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)}>
                  <div className="text-center py-8 text-gray-500">
                    {emptyMessage}
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading && paginatedData.map((row, index) => {
              const actualIndex = pagination ? startIndex + index : index;
              const isSelected = selected.has(actualIndex);
              
              return (
                <TableRow
                  key={index}
                  selected={isSelected}
                  clickable={selectable}
                  onClick={selectable ? () => toggleRowSelection(index) : undefined}
                >
                  {selectable && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRowSelection(index)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </TableCell>
                  )}
                  
                  {columns.map((column) => (
                    <TableCell
                      key={String(column.key)}
                      className={cx(
                        (column.align === 'left' || !column.align) ? 'text-left' : '',
                        column.align === 'center' ? 'text-center' : '',
                        column.align === 'right' ? 'text-right' : '',
                        column.className
                      )}
                    >
                      {column.render 
                        ? column.render(row[column.key], row, actualIndex)
                        : String(row[column.key] || '')
                      }
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && !loading && (
        <DataTablePagination
          currentPage={page}
          totalPages={calculatedTotalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={handlePageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

// =============================================================================
// PAGINATION COMPONENT
// =============================================================================

export const DataTablePagination: React.FC<DataTablePaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  className
}) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getVisiblePages = () => {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <div className={cx('flex items-center justify-between', className)}>
      {/* Results info */}
      <div className="text-sm text-gray-700">
        Showing {startItem} to {endItem} of {totalItems} results
      </div>

      <div className="flex items-center gap-2">
        {/* Page size selector */}
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Previous
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {getVisiblePages().map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <span className="px-2 py-1 text-gray-400">...</span>
                ) : (
                  <Button
                    variant={currentPage === page ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => onPageChange(page as number)}
                    className="min-w-8"
                  >
                    {page}
                  </Button>
                )}
              </React.Fragment>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// HOOKS
// =============================================================================

export function useDataTable<T extends Record<string, any>>(
  data: T[],
  initialPageSize = 10
): UseDataTableReturn<T> {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [searchValue, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchValue) return data;
    
    const searchLower = searchValue.toLowerCase();
    return data.filter((row) => {
      return Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchLower)
      );
    });
  }, [data, searchValue]);

  // Paginate filtered data
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchValue]);

  // Selection helpers
  const toggleRowSelection = useCallback((index: number) => {
    const actualIndex = startIndex + index;
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(actualIndex)) {
        newSet.delete(actualIndex);
      } else {
        newSet.add(actualIndex);
      }
      return newSet;
    });
  }, [startIndex]);

  const selectAllRows = useCallback(() => {
    setSelectedRows(new Set(Array.from({ length: filteredData.length }, (_, i) => i)));
  }, [filteredData.length]);

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const isRowSelected = useCallback((index: number) => {
    return selectedRows.has(startIndex + index);
  }, [selectedRows, startIndex]);

  const isAllSelected = filteredData.length > 0 && selectedRows.size === filteredData.length;
  const isSomeSelected = selectedRows.size > 0 && selectedRows.size < filteredData.length;

  return {
    filteredData,
    paginatedData,
    selectedRows,
    searchValue,
    currentPage,
    totalPages,
    setSearchValue,
    setCurrentPage,
    setPageSize,
    toggleRowSelection,
    selectAllRows,
    clearSelection,
    isRowSelected,
    isAllSelected,
    isSomeSelected
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default DataTable;