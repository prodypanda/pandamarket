/**
 * CSV Export Utility — converts JSON data to CSV and triggers browser download.
 *
 * Usage:
 *   import { exportToCsv } from '@/lib/csv-export';
 *   exportToCsv(products, 'products-export.csv', ['id', 'title', 'price', 'stock']);
 */

export interface CsvColumn {
  key: string;
  label: string;
  formatter?: (value: unknown) => string;
}

/**
 * Convert an array of objects to a CSV string.
 */
export function jsonToCsv(
  data: Record<string, unknown>[],
  columns?: CsvColumn[] | string[],
): string {
  if (data.length === 0) return '';

  // Determine columns
  let cols: CsvColumn[];
  if (!columns) {
    // Auto-detect from first row
    cols = Object.keys(data[0]).map((key) => ({ key, label: key }));
  } else if (typeof columns[0] === 'string') {
    cols = (columns as string[]).map((key) => ({ key, label: key }));
  } else {
    cols = columns as CsvColumn[];
  }

  // Header row
  const header = cols.map((c) => escapeCsvField(c.label)).join(',');

  // Data rows
  const rows = data.map((row) =>
    cols
      .map((col) => {
        const value = row[col.key];
        if (col.formatter) return escapeCsvField(col.formatter(value));
        return escapeCsvField(formatValue(value));
      })
      .join(','),
  );

  return [header, ...rows].join('\n');
}

/**
 * Trigger a browser download of a CSV file.
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convenience function: convert data to CSV and download.
 */
export function exportToCsv(
  data: Record<string, unknown>[],
  filename: string,
  columns?: CsvColumn[] | string[],
): void {
  const csv = jsonToCsv(data, columns);
  downloadCsv(csv, filename);
}

// =====================================================
// Helpers
// =====================================================

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.join('; ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
