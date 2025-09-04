import { Theme } from '../types';

export class ThemeService {
    // Service to manage theme switching.
    static getInitialTheme(): Theme {
        const savedTheme = localStorage.getItem('theme') as Theme | null;
        const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return savedTheme || (userPrefersDark ? 'dark' : 'light');
    }

    static applyTheme(theme: Theme) {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }
}
