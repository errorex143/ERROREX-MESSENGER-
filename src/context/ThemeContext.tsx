import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeName, ColorMode } from '../types';

interface ThemeContextType {
  theme: ThemeName;
  mode: ColorMode;
  resolvedMode: 'dark' | 'light';
  autoCycleEnabled: boolean;
  secondsRemaining: number;
  formattedCountdown: string;
  setTheme: (theme: ThemeName) => void;
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
  setAutoCycleEnabled: (enabled: boolean) => void;
  cycleNextTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export interface ThemeOption {
  id: ThemeName;
  name: string;
  primaryHex: string;
  secondaryHex: string;
  description: string;
  isRainbow?: boolean;
  checkColor?: 'dark' | 'light';
}

export const THEMES: ThemeOption[] = [
  { id: 'rainbow', name: 'Rainbow Prism', primaryHex: '#FF007F', secondaryHex: '#00E5FF', description: 'Vibrant multi-color rainbow spectrum', isRainbow: true, checkColor: 'light' },
  { id: 'gold', name: 'Royal Gold', primaryHex: '#EAB308', secondaryHex: '#CA8A04', description: 'Classic regal gold with warm metallic luster', checkColor: 'dark' },
  { id: 'amber', name: 'Solar Orange', primaryHex: '#FF6B00', secondaryHex: '#EA580C', description: 'Vibrant solar tangerine orange', checkColor: 'dark' },
  { id: 'coral', name: 'Warm Coral', primaryHex: '#FF5A5F', secondaryHex: '#E11D48', description: 'Bright coral peach glow', checkColor: 'light' },
  { id: 'crimson', name: 'Ruby Red', primaryHex: '#DC2626', secondaryHex: '#991B1B', description: 'Deep ruby crimson fire', checkColor: 'light' },
  { id: 'magenta', name: 'Hot Magenta', primaryHex: '#EC4899', secondaryHex: '#BE185D', description: 'Vivid neon magenta rose', checkColor: 'light' },
  { id: 'orchid', name: 'Electric Orchid', primaryHex: '#D946EF', secondaryHex: '#A21CAF', description: 'Luminous ultraviolet orchid', checkColor: 'light' },
  { id: 'purple', name: 'Deep Amethyst', primaryHex: '#8B5CF6', secondaryHex: '#6D28D9', description: 'Majestic violet amethyst', checkColor: 'light' },
  { id: 'indigo', name: 'Cosmic Indigo', primaryHex: '#6366F1', secondaryHex: '#4338CA', description: 'Electric cobalt indigo', checkColor: 'light' },
  { id: 'cobalt', name: 'Sapphire Blue', primaryHex: '#2563EB', secondaryHex: '#1D4ED8', description: 'Rich royal sapphire blue', checkColor: 'light' },
  { id: 'sky', name: 'Sky Azure', primaryHex: '#0EA5E9', secondaryHex: '#0284C7', description: 'Crisp high-altitude azure sky', checkColor: 'dark' },
  { id: 'cyan', name: 'Cyber Aqua', primaryHex: '#06B6D4', secondaryHex: '#0891B2', description: 'Neon glacier cyan aqua', checkColor: 'dark' },
  { id: 'emerald', name: 'Mint Emerald', primaryHex: '#10B981', secondaryHex: '#047857', description: 'Fresh vibrant emerald jade', checkColor: 'dark' },
  { id: 'lime', name: 'Electric Lime', primaryHex: '#84CC16', secondaryHex: '#4D7C0F', description: 'High-contrast electric lime', checkColor: 'dark' },
  { id: 'copper', name: 'Molten Copper', primaryHex: '#B45309', secondaryHex: '#78350F', description: 'Rich antique bronze copper', checkColor: 'light' },
  { id: 'platinum', name: 'Ice Platinum', primaryHex: '#94A3B8', secondaryHex: '#475569', description: 'Sleek metallic titanium silver', checkColor: 'dark' }
];

const LEGACY_THEME_MAP: Record<string, ThemeName> = {
  ocean: 'cobalt',
  rose: 'magenta',
  sunset: 'amber',
  electric: 'cyan',
  teal: 'emerald',
  midnight: 'indigo',
  forest: 'emerald',
  bronze: 'copper',
  white: 'platinum',
  black: 'platinum'
};

function resolveValidTheme(raw: string | null): ThemeName {
  if (!raw) return 'gold';
  if (THEMES.some(t => t.id === raw)) return raw as ThemeName;
  return LEGACY_THEME_MAP[raw] || 'gold';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    return resolveValidTheme(localStorage.getItem('errorex_theme'));
  });

  const [mode, setModeState] = useState<ColorMode>(() => {
    return (localStorage.getItem('errorex_mode') as ColorMode) || 'dark';
  });

  const [autoCycleEnabled, setAutoCycleEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('errorex_auto_cycle') === 'true';
  });

  const [secondsRemaining, setSecondsRemaining] = useState<number>(600); // 10 minutes = 600s
  const [resolvedMode, setResolvedMode] = useState<'dark' | 'light'>('dark');

  // Handle theme attribute on document root
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('errorex_theme', theme);
  }, [theme]);

  // 10-minute Auto Theme Color Rotation Cycle
  useEffect(() => {
    localStorage.setItem('errorex_auto_cycle', String(autoCycleEnabled));
    if (!autoCycleEnabled) return;

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          // Advance to next theme across the entire site
          setThemeState(currentTheme => {
            const curIdx = THEMES.findIndex(t => t.id === currentTheme);
            const nextIdx = (curIdx + 1) % THEMES.length;
            const nextTheme = THEMES[nextIdx].id;
            localStorage.setItem('errorex_theme', nextTheme);
            document.documentElement.setAttribute('data-theme', nextTheme);
            return nextTheme;
          });
          return 600; // Reset to 10 minutes
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoCycleEnabled]);

  // Handle mode (dark / light / system)
  useEffect(() => {
    const applyMode = () => {
      let active: 'dark' | 'light' = 'dark';
      if (mode === 'system') {
        active = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        active = mode;
      }
      setResolvedMode(active);

      const root = document.documentElement;
      const body = document.body;
      root.setAttribute('data-mode', active);
      root.setAttribute('data-selected-mode', mode);

      if (active === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        body.classList.add('dark');
        body.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        body.classList.remove('dark');
        body.classList.add('light');
      }
    };

    applyMode();
    localStorage.setItem('errorex_mode', mode);

    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyMode();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [mode]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
  };

  const setMode = (newMode: ColorMode) => {
    setModeState(newMode);
  };

  const toggleMode = () => {
    setModeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setAutoCycleEnabled = (enabled: boolean) => {
    setAutoCycleEnabledState(enabled);
    if (enabled) {
      setSecondsRemaining(600);
    }
  };

  const cycleNextTheme = () => {
    setThemeState(currentTheme => {
      const curIdx = THEMES.findIndex(t => t.id === currentTheme);
      const nextIdx = (curIdx + 1) % THEMES.length;
      const nextTheme = THEMES[nextIdx].id;
      localStorage.setItem('errorex_theme', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
      return nextTheme;
    });
    setSecondsRemaining(600);
  };

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const formattedCountdown = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        mode,
        resolvedMode,
        autoCycleEnabled,
        secondsRemaining,
        formattedCountdown,
        setTheme,
        setMode,
        toggleMode,
        setAutoCycleEnabled,
        cycleNextTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
