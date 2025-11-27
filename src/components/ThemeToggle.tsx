import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-md border border-theme-border hover:bg-theme-elevated transition-colors"
            aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}>
            {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-theme-text" />
            ) : (
                <Moon className="w-5 h-5 text-theme-text" />
            )}
        </button>
    );
}


