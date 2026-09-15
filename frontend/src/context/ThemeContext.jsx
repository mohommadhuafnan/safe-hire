import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
    document.body.classList.remove('light');
    document.body.classList.add('dark');
    localStorage.setItem('safe_hire_theme', 'dark');
  }, []);

  const toggleTheme = () => {
    // Permanent Dark Mode
    setTheme('dark');
  };

  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
