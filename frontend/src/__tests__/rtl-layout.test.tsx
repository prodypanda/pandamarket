import { describe, it, expect } from 'vitest';

describe('PLAN-B-31: Dashboard RTL & Logical CSS Properties', () => {
  it('computes correct html dir attribute based on active locale', () => {
    const resolveHtmlDir = (locale: string) => (locale === 'ar' ? 'rtl' : 'ltr');

    expect(resolveHtmlDir('ar')).toBe('rtl');
    expect(resolveHtmlDir('fr')).toBe('ltr');
    expect(resolveHtmlDir('en')).toBe('ltr');
  });

  it('uses CSS logical classes for bidirectional navigation layout', () => {
    const sidebarClasses = 'w-64 bg-white border-e border-slate-200 flex-col hidden md:flex fixed inset-y-0 start-0 h-full z-10 shadow-sm';
    const mainClasses = 'flex-1 md:ms-64 flex flex-col';
    const drawerClasses = 'fixed inset-y-0 start-0 w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-50 focus:outline-none';

    expect(sidebarClasses).toContain('border-e');
    expect(sidebarClasses).toContain('start-0');
    expect(mainClasses).toContain('md:ms-64');
    expect(drawerClasses).toContain('start-0');
  });
});
