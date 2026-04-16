import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeId = 'dark' | 'light' | 'classy' | 'style' | 'modern';

export interface ThemeColors {
  bg0: string;        // deepest background
  bg1: string;        // surface 1
  bg2: string;        // surface 2 (cards)
  bg3: string;        // surface 3 (inputs)
  border: string;
  borderSubtle: string;
  accent: string;
  accentHover: string;
  accentDim: string;
  text: string;
  textMuted: string;
  textDim: string;
  nodeHeaderBg: string;
  canvasDots: string;
}

export interface ThemeDef {
  id: ThemeId;
  label: string;
  description: string;
  colors: ThemeColors;
}

export const THEMES: ThemeDef[] = [
  {
    id: 'dark',
    label: 'Dark',
    description: 'Deep black with violet accents',
    colors: {
      bg0: '#09090b',
      bg1: '#0f0f12',
      bg2: '#18181b',
      bg3: '#1f1f23',
      border: '#27272a',
      borderSubtle: '#1c1c20',
      accent: '#8b5cf6',
      accentHover: '#a78bfa',
      accentDim: 'rgba(139,92,246,0.12)',
      text: '#fafafa',
      textMuted: '#a1a1aa',
      textDim: '#52525b',
      nodeHeaderBg: '#0f0f12',
      canvasDots: '#27272a',
    },
  },
  {
    id: 'light',
    label: 'Light',
    description: 'Clean white with blue accents',
    colors: {
      bg0: '#f8f9fa',
      bg1: '#ffffff',
      bg2: '#f1f3f5',
      bg3: '#e9ecef',
      border: '#dee2e6',
      borderSubtle: '#e9ecef',
      accent: '#4361ee',
      accentHover: '#3a56d4',
      accentDim: 'rgba(67,97,238,0.1)',
      text: '#1a1a2e',
      textMuted: '#6c757d',
      textDim: '#adb5bd',
      nodeHeaderBg: '#ffffff',
      canvasDots: '#ced4da',
    },
  },
  {
    id: 'classy',
    label: 'Classy',
    description: 'Warm gold and charcoal',
    colors: {
      bg0: '#111111',
      bg1: '#1a1a1a',
      bg2: '#222222',
      bg3: '#2a2a2a',
      border: '#333333',
      borderSubtle: '#282828',
      accent: '#d4a76a',
      accentHover: '#e0b97e',
      accentDim: 'rgba(212,167,106,0.12)',
      text: '#f5f0e8',
      textMuted: '#b0a899',
      textDim: '#6b6560',
      nodeHeaderBg: '#1a1a1a',
      canvasDots: '#333333',
    },
  },
  {
    id: 'style',
    label: 'Style',
    description: 'Rose pink and deep navy',
    colors: {
      bg0: '#0c0a14',
      bg1: '#12101c',
      bg2: '#1a1726',
      bg3: '#221e30',
      border: '#2d2840',
      borderSubtle: '#1f1b2e',
      accent: '#f472b6',
      accentHover: '#f9a8d4',
      accentDim: 'rgba(244,114,182,0.12)',
      text: '#faf5ff',
      textMuted: '#a78bfa',
      textDim: '#5b4f7a',
      nodeHeaderBg: '#12101c',
      canvasDots: '#2d2840',
    },
  },
  {
    id: 'modern',
    label: 'Modern',
    description: 'Teal and carbon slate',
    colors: {
      bg0: '#0a0f0f',
      bg1: '#0f1616',
      bg2: '#162020',
      bg3: '#1e2a2a',
      border: '#253535',
      borderSubtle: '#1a2828',
      accent: '#2dd4bf',
      accentHover: '#5eead4',
      accentDim: 'rgba(45,212,191,0.12)',
      text: '#f0fdfa',
      textMuted: '#6dac9f',
      textDim: '#3d6b62',
      nodeHeaderBg: '#0f1616',
      canvasDots: '#253535',
    },
  },
];

type ThemeStore = {
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
  current: () => ThemeDef;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      themeId: 'dark' as ThemeId,
      setTheme: (id: ThemeId) => {
        set({ themeId: id });
        applyThemeToDOM(id);
      },
      current: () => THEMES.find(t => t.id === get().themeId) || THEMES[0],
    }),
    { name: 'realhistic-theme' }
  )
);

/** Write CSS custom properties onto :root so everything inherits */
export function applyThemeToDOM(id: ThemeId) {
  const t = THEMES.find(x => x.id === id) || THEMES[0];
  const root = document.documentElement;
  Object.entries(t.colors).forEach(([key, val]) => {
    root.style.setProperty(`--t-${key}`, val);
  });
}
