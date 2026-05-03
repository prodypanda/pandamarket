import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Skeleton,
  ProductCardSkeleton,
  ProductGridSkeleton,
  ProductDetailSkeleton,
  OrderListSkeleton,
  DashboardStatsSkeleton,
} from '../components/ui/Skeleton';

describe('Skeleton Components', () => {
  it('renders base Skeleton with custom className', () => {
    const { container } = render(<Skeleton className="h-8 w-32" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.className).toContain('animate-pulse');
    expect(el.className).toContain('h-8');
    expect(el.className).toContain('w-32');
  });

  it('renders ProductCardSkeleton', () => {
    const { container } = render(<ProductCardSkeleton />);
    // Should have the card wrapper with skeleton children
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(3); // image + category + title + price + store
  });

  it('renders ProductGridSkeleton with default count', () => {
    const { container } = render(<ProductGridSkeleton />);
    // Default count is 8
    const cards = container.querySelectorAll('.aspect-square');
    expect(cards.length).toBe(8);
  });

  it('renders ProductGridSkeleton with custom count', () => {
    const { container } = render(<ProductGridSkeleton count={4} />);
    const cards = container.querySelectorAll('.aspect-square');
    expect(cards.length).toBe(4);
  });

  it('renders ProductGridSkeleton with responsive grid classes', () => {
    const { container } = render(<ProductGridSkeleton />);
    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain('grid-cols-2');
    expect(grid.className).toContain('sm:grid-cols-3');
    expect(grid.className).toContain('lg:grid-cols-4');
    expect(grid.className).toContain('xl:grid-cols-5');
  });

  it('renders ProductDetailSkeleton with image and info sections', () => {
    const { container } = render(<ProductDetailSkeleton />);
    // Should have a grid layout
    const grid = container.querySelector('.grid');
    expect(grid).toBeTruthy();
    // Should have thumbnail placeholders
    const thumbnails = container.querySelectorAll('.w-16');
    expect(thumbnails.length).toBe(4);
  });

  it('renders OrderListSkeleton with default count', () => {
    const { container } = render(<OrderListSkeleton />);
    const items = container.querySelectorAll('.bg-white');
    expect(items.length).toBe(5);
  });

  it('renders OrderListSkeleton with custom count', () => {
    const { container } = render(<OrderListSkeleton count={3} />);
    const items = container.querySelectorAll('.bg-white');
    expect(items.length).toBe(3);
  });

  it('renders DashboardStatsSkeleton with 4 stat cards', () => {
    const { container } = render(<DashboardStatsSkeleton />);
    const cards = container.querySelectorAll('.bg-white');
    expect(cards.length).toBe(4);
  });
});
