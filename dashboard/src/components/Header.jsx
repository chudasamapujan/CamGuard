import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, CalendarDays, Server, RefreshCw } from 'lucide-react';

function Header({ apiStatus = 'online', lastUpdated, onRefresh }) {
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

    const formattedLastUpdated = useMemo(() => {
        if (!lastUpdated) return 'N/A';
        return lastUpdated.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
    }, [lastUpdated]);

    return (
        <header className="header" role="banner">
            <div className="header__left">
                <span className="header__title">CamGuard</span>
                <span className="header__subtitle">Enterprise Camera Health Monitoring</span>
            </div>

            <div className="header__right">
                {/* Backend Connection Status */}
                <div className={`status-badge-header status-badge-header--${apiStatus}`} title="Backend Connection Status">
                    <Server size={14} />
                    <span>{apiStatus === 'online' ? '🟢 Live' : '🔴 Disconnected'}</span>
                </div>

                <div className="header__last-update" style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    <span>Last Updated: {formattedLastUpdated}</span>
                </div>

                <div className="header__datetime" aria-label={`${formattedDate} ${formattedTime}`}>
                    <CalendarDays size={14} />
                    <span className="header__date">{formattedDate}</span>
                    <span className="header__time">{formattedTime}</span>
                </div>

                <button
                    className="header__btn"
                    onClick={onRefresh}
                    title="Refresh telemetry"
                    aria-label="Refresh telemetry"
                >
                    <RefreshCw size={14} />
                </button>

                <button
                    className="header__btn"
                    onClick={toggleTheme}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </button>
            </div>
        </header>
    );
}

export default React.memo(Header);
