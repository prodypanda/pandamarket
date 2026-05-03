import { describe, it, expect } from 'vitest';
import { jsonToCsv } from '../lib/csv-export';

describe('CSV Export Utility', () => {
  const sampleData = [
    { id: '1', title: 'Product A', price: 85.0, stock: 12, active: true },
    { id: '2', title: 'Product B', price: 45.5, stock: 0, active: false },
    { id: '3', title: 'Product C', price: 120.0, stock: 5, active: true },
  ];

  it('generates CSV with auto-detected columns', () => {
    const csv = jsonToCsv(sampleData);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('id,title,price,stock,active');
    expect(lines[1]).toBe('1,Product A,85,12,Yes');
    expect(lines[2]).toBe('2,Product B,45.5,0,No');
    expect(lines).toHaveLength(4); // header + 3 rows
  });

  it('generates CSV with specified string columns', () => {
    const csv = jsonToCsv(sampleData, ['id', 'title', 'price']);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('id,title,price');
    expect(lines[1]).toBe('1,Product A,85');
  });

  it('generates CSV with custom column definitions', () => {
    const csv = jsonToCsv(sampleData, [
      { key: 'title', label: 'Product Name' },
      { key: 'price', label: 'Price (TND)', formatter: (v) => `${v} TND` },
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Product Name,Price (TND)');
    expect(lines[1]).toBe('Product A,85 TND');
  });

  it('escapes fields containing commas', () => {
    const data = [{ name: 'Product A, B', value: 10 }];
    const csv = jsonToCsv(data);
    expect(csv).toContain('"Product A, B"');
  });

  it('escapes fields containing double quotes', () => {
    const data = [{ name: 'Product "Special"', value: 10 }];
    const csv = jsonToCsv(data);
    expect(csv).toContain('"Product ""Special"""');
  });

  it('escapes fields containing newlines', () => {
    const data = [{ name: 'Line1\nLine2', value: 10 }];
    const csv = jsonToCsv(data);
    expect(csv).toContain('"Line1\nLine2"');
  });

  it('handles null and undefined values', () => {
    const data = [{ a: null, b: undefined, c: 'ok' }];
    const csv = jsonToCsv(data);
    const lines = csv.split('\n');
    expect(lines[1]).toBe(',,ok');
  });

  it('handles arrays in values', () => {
    const data = [{ tags: ['red', 'blue', 'green'] }];
    const csv = jsonToCsv(data);
    expect(csv).toContain('red; blue; green');
  });

  it('returns empty string for empty data', () => {
    const csv = jsonToCsv([]);
    expect(csv).toBe('');
  });

  it('handles Date objects', () => {
    const date = new Date('2026-05-03T12:00:00Z');
    const data = [{ created: date }];
    const csv = jsonToCsv(data);
    expect(csv).toContain('2026-05-03');
  });
});
