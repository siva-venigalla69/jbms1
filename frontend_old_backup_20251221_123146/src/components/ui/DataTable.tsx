import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Checkbox,
  IconButton,
  Tooltip,
  Box,
  Typography,
  TextField,
  InputAdornment,
  Toolbar,
  alpha
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import LoadingSpinner from './LoadingSpinner';
import ErrorAlert from './ErrorAlert';

export interface Column<T> {
  id: keyof T;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string | React.ReactNode;
  sortable?: boolean;
  searchable?: boolean;
}

export interface TableAction<T> {
  icon: React.ReactNode;
  label: string;
  onClick: (row: T) => void;
  disabled?: (row: T) => boolean;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  totalCount?: number;
  page?: number;
  rowsPerPage?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  onSearch?: (searchTerm: string) => void;
  searchPlaceholder?: string;
  actions?: TableAction<T>[];
  selectable?: boolean;
  selectedIds?: Set<string | number>;
  onSelectionChange?: (selectedIds: Set<string | number>) => void;
  getRowId?: (row: T) => string | number;
  emptyMessage?: string;
  title?: string;
}

function DataTable<T>({
  columns,
  data,
  loading = false,
  error = null,
  totalCount = 0,
  page = 0,
  rowsPerPage = 25,
  onPageChange,
  onRowsPerPageChange,
  onSearch,
  searchPlaceholder = 'Search...',
  actions = [],
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  getRowId = (row: any) => row.id,
  emptyMessage = 'No data available',
  title
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;

    if (event.target.checked) {
      const newSelected = new Set(data.map(getRowId));
      onSelectionChange(newSelected);
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleRowSelect = (rowId: string | number) => {
    if (!onSelectionChange) return;

    const newSelected = new Set(selectedIds);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    onSelectionChange(newSelected);
  };

  const isSelected = (rowId: string | number) => selectedIds.has(rowId);
  const numSelected = selectedIds.size;
  const numRows = data.length;

  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <ErrorAlert
          error={error}
          title="Failed to load data"
          onRetry={() => window.location.reload()}
        />
      </Paper>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {(title || onSearch || numSelected > 0) && (
        <Toolbar
          sx={{
            pl: { sm: 2 },
            pr: { xs: 1, sm: 1 },
            ...(numSelected > 0 && {
              bgcolor: (theme) =>
                alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
            }),
          }}
        >
          {numSelected > 0 ? (
            <Typography
              sx={{ flex: '1 1 100%' }}
              color="inherit"
              variant="subtitle1"
              component="div"
            >
              {numSelected} selected
            </Typography>
          ) : (
            <Typography
              sx={{ flex: '1 1 100%' }}
              variant="h6"
              id="tableTitle"
              component="div"
            >
              {title}
            </Typography>
          )}

          {onSearch && numSelected === 0 && (
            <Box sx={{ minWidth: 200 }}>
              <TextField
                size="small"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          )}
        </Toolbar>
      )}

      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="data table">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={numSelected > 0 && numSelected < numRows}
                    checked={numRows > 0 && numSelected === numRows}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={String(column.id)}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.label}
                </TableCell>
              ))}
              {actions.length > 0 && (
                <TableCell align="center">Actions</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}>
                  <LoadingSpinner message="Loading data..." />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)}>
                  <Box display="flex" justifyContent="center" py={4}>
                    <Typography variant="body2" color="text.secondary">
                      {emptyMessage}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => {
                const rowId = getRowId(row);
                const isItemSelected = isSelected(rowId);

                return (
                  <TableRow
                    hover
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={String(rowId)}
                    selected={isItemSelected}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          onChange={() => handleRowSelect(rowId)}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => {
                      const value = row[column.id];
                      return (
                        <TableCell key={String(column.id)} align={column.align}>
                          {column.format ? column.format(value) : String(value || '')}
                        </TableCell>
                      );
                    })}
                    {actions.length > 0 && (
                      <TableCell align="center">
                        <Box display="flex" justifyContent="center" gap={0.5}>
                          {actions.map((action, index) => (
                            <Tooltip key={index} title={action.label}>
                              <span>
                                <IconButton
                                  size="small"
                                  color={action.color || 'default'}
                                  onClick={() => action.onClick(row)}
                                  disabled={action.disabled?.(row)}
                                >
                                  {action.icon}
                                </IconButton>
                              </span>
                            </Tooltip>
                          ))}
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {(onPageChange || onRowsPerPageChange) && (
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => onPageChange?.(newPage)}
          onRowsPerPageChange={(event) =>
            onRowsPerPageChange?.(parseInt(event.target.value, 10))
          }
        />
      )}
    </Paper>
  );
}

export default DataTable;