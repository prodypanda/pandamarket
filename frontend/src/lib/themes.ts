export type ThemeId = 'minimal' | 'classic' | 'modern' | 'boutique' | 'artisan' | 'techhub' | 'flavor';

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
  boutique: {
    id: 'boutique',
    name: 'Boutique',
    colors: {
      primary: 'bg-[#1C1C1C] text-[#F5F0EB]',
      secondary: 'bg-[#F5F0EB] text-[#1C1C1C]',
      accent: 'text-[#C9A96E]',
      background: 'bg-[#F5F0EB]',
      text: 'text-[#1C1C1C]',
    },
    typography: {
      fontFamily: 'font-serif',
      headingStyle: 'font-light tracking-[0.15em] uppercase',
    },
    layout: {
      headerStyle: 'center',
      productGrid: 'relaxed',
      borderRadius: 'rounded-none',
    },
  },
  artisan: {
    id: 'artisan',
    name: 'Artisan',
    colors: {
      primary: 'bg-[#5C4033] text-white',
      secondary: 'bg-[#FFF8F0] text-[#3E2723]',
      accent: 'text-[#5C4033]',
      background: 'bg-[#FFF8F0]',
      text: 'text-[#3E2723]',
    },
    typography: {
      fontFamily: 'font-serif',
      headingStyle: 'font-semibold tracking-normal',
    },
    layout: {
      headerStyle: 'left',
      productGrid: 'masonry',
      borderRadius: 'rounded-xl',
    },
  },
  techhub: {
    id: 'techhub',
    name: 'TechHub',
    colors: {
      primary: 'bg-[#00D4FF] text-[#0A0A0A]',
      secondary: 'bg-[#111111] text-[#E0E0E0]',
      accent: 'text-[#00D4FF]',
      background: 'bg-[#0A0A0A]',
      text: 'text-[#E0E0E0]',
    },
    typography: {
      fontFamily: 'font-sans',
      headingStyle: 'font-bold tracking-tight',
    },
    layout: {
      headerStyle: 'split',
      productGrid: 'tight',
      borderRadius: 'rounded-lg',
    },
  },
  flavor: {
    id: 'flavor',
    name: 'Flavor',
    colors: {
      primary: 'bg-[#D4451A] text-white',
      secondary: 'bg-[#FFF9F5] text-[#2D1B0E]',
      accent: 'text-[#D4451A]',
      background: 'bg-[#FFFCF8]',
      text: 'text-[#2D1B0E]',
    },
    typography: {
      fontFamily: 'font-sans',
      headingStyle: 'font-extrabold tracking-tight',
    },
    layout: {
      headerStyle: 'center',
      productGrid: 'tight',
      borderRadius: 'rounded-2xl',
    },
  },
};
