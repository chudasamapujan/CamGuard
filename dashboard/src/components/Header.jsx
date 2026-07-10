import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
    Sun, Moon, Settings, Radio, CalendarDays,
} from 'lucide-react';

function Header({ onOpenSettings }) {
    const { theme, toggleTheme } = useTheme();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const formattedDate = useMemo(() =>
        time.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        }), [time.toDateString()]
    );

    const formattedTime = time.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    });

    return (
        <header className="header" role="banner">
            <div className="header__left">
                <div className="header__logo" aria-hidden="true">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                        <rect width="28" height="28" rx="7" fill="var(--color-primary)" />
                        <path d="M7 11L14 7L21 11V17L14 21L7 17V11Z" stroke="#fff" strokeWidth="1.5" fill="none" />
                        <circle cx="14" cy="14" r="2.5" fill="#fff" />
                    </svg>
                </div>
                <div>
                    <h1 className="header__title">CamGuard</h1>
                    <p className="header__subtitle">Camera Health Monitor</p>
                </div>
            </div>

            <div className="header__right">
                <div className="header__live" role="status" aria-label="System is live">
                    <Radio size={14} />
                    <span>LIVE</span>
                </div>

                <div className="header__datetime" aria-label={`${formattedDate} ${formattedTime}`}>
                    <CalendarDays size={14} />
                    <span className="header__date">{formattedDate}</span>
                    <span className="header__time">{formattedTime}</span>
                </div>

                <button
                    className="header__btn"
                    onClick={toggleTheme}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <button
                    className="header__btn"
                    onClick={onOpenSettings}
                    aria-label="Open settings"
                    title="Settings"
                >
                    <Settings size={18} />
                </button>
            </div>
        </header>
    );
}

export default React.memo(Header);
