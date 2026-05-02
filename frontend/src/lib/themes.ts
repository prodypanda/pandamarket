export type ThemeId = 'minimal' | 'classic' | 'modern';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    fontFamily: string;
    headingStyle: string;
  };
  layout: {
    headerStyle: 'center' | 'left' | 'split';
    productGrid: 'tight' | 'relaxed' | 'masonry';
    borderRadius: string;
  };
}

export const themes: Record<ThemeId, ThemeConfig> = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    colors: {
      primary: 'bg-black text-white',
      secondary: 'bg-gray-100 text-gray-900',
      accent: 'text-black',
      background: 'bg-white',
      text: 'text-gray-900',
    },
    typography: {
      fontFamily: 'font-sans',
      headingStyle: 'font-bold tracking-tight',
    },
    layout: {
      headerStyle: 'left',
      productGrid: 'relaxed',
      borderRadius: 'rounded-none',
    },
  },
  classic: {
    id: 'classic',
    name: 'Classic',
    colors: {
      primary: 'bg-blue-600 text-white',
      secondary: 'bg-blue-50 text-blue-900',
      accent: 'text-blue-600',
      background: 'bg-gray-50',
      text: 'text-gray-800',
    },
    typography: {
      fontFamily: 'font-serif',
      headingStyle: 'font-semibold',
    },
    layout: {
      headerStyle: 'center',
      productGrid: 'tight',
      borderRadius: 'rounded-md',
    },
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    colors: {
      primary: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white',
      secondary: 'bg-white/10 backdrop-blur-md text-white',
      accent: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-600',
      background: 'bg-slate-900',
      text: 'text-slate-100',
    },
    typography: {
      fontFamily: 'font-sans',
      headingStyle: 'font-extrabold tracking-tighter',
    },
    layout: {
      headerStyle: 'split',
      productGrid: 'masonry',
      borderRadius: 'rounded-2xl',
    },
  },
};
