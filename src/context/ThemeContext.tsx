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

export const THEMES: { id: ThemeName; name: string; primaryHex: string; description: string }[] = [
  { id: 'gold', name: 'Imperial Gold', primaryHex: '#D4AF37', description: 'Classic regal gold with metallic luster' },
  { id: 'white', name: 'Platinum White', primaryHex: '#F8FAFC', description: 'Pure diamond white with crystalline shine' },
  { id: 'black', name: 'Obsidian Black', primaryHex: '#0A0A0C', description: 'Deep velvet onyx black with dark mirror luster' },
  { id: 'crimson', name: 'Blood Crimson', primaryHex: '#DC2626', description: 'Dark wine ruby with deep metallic fire' },
  { id: 'midnight', name: 'Midnight Indigo', primaryHex: '#6366F1', description: 'Dark cosmic violet with neon luster' },
  { id: 'forest', name: 'Dark Forest', primaryHex: '#059669', description: 'Deep dark imperial emerald with jade shine' },
  { id: 'bronze', name: 'Dark Bronze', primaryHex: '#D97706', description: 'Rich antique copper bronze with molten luster' },
  { id: 'emerald', name: 'Royal Emerald', primaryHex: '#10B981', description: 'Deep imperial jade & emerald crystal' },
  { id: 'ocean', name: 'Sapphire Blue', primaryHex: '#3B82F6', description: 'Monaco sapphire & deep marine blue' },
  { id: 'purple', name: 'Velvet Purple', primaryHex: '#A855F7', description: 'Majestic royal purple gemstone' },
  { id: 'rose', name: 'Crimson Ruby', primaryHex: '#F43F5E', description: 'Precious metallic rose & ruby fire' },
  { id: 'sunset', name: 'Solar Amber', primaryHex: '#F97316', description: 'Radiant warm solar amber horizon' },
  { id: 'electric', name: 'Electric Cyan', primaryHex: '#06B6D4', description: 'High-tech cyber platinum & cyan' },
  { id: 'teal', name: 'Midnight Teal', primaryHex: '#14B8A6', description: 'Lustrous titanium teal mineral' }
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    return (localStorage.getItem('errorex_theme') as ThemeName) || 'gold';
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
