// app/context/ThemeContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { darkTheme, lightTheme } from '../theme/theme';

// Define available types
type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    theme: typeof lightTheme;
    toggleTheme: () => void;
    setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: lightTheme,
    toggleTheme: () => { },
    setMode: (_mode: ThemeMode) => { },
});

export const ThemeProvider = ({ children }: any) => {
    const [theme, setTheme] = useState({ ...lightTheme, mode: 'light' });

    useEffect(() => {
        const loadTheme = async () => {
            const savedTheme = await AsyncStorage.getItem('theme');
            if (savedTheme === 'dark') {
                setTheme({ ...darkTheme, mode: 'dark' });
            } else {
                setTheme({ ...lightTheme, mode: 'light' });
            }
        };
        loadTheme();
    }, []);

    const toggleTheme = async () => {
        const newMode: ThemeMode = theme.mode === 'dark' ? 'light' : 'dark';
        const newTheme = newMode === 'dark' ? darkTheme : lightTheme;
        setTheme({ ...newTheme, mode: newMode });
        await AsyncStorage.setItem('theme', newMode);
    };

    const setMode = async (mode: ThemeMode) => {
        const newTheme = mode === 'dark' ? darkTheme : lightTheme;
        setTheme({ ...newTheme, mode });
        await AsyncStorage.setItem('theme', mode);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
