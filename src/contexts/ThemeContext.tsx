import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'luminous' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'luminous', toggleTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('voxly-theme');
    return (saved === 'dark' ? 'dark' : 'luminous') as Theme;
  });

  useEffect(() => {
    localStorage.setItem('voxly-theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'luminous' ? 'dark' : 'luminous');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
