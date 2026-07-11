import React from 'react';
import { LayoutDashboard, Sliders, Video } from 'lucide-react';

export default function Sidebar({ activePage, setActivePage }) {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'settings', label: 'Settings', icon: Sliders },
    ];

    return (
        <aside className="sidebar" role="navigation" aria-label="Main Navigation">
            <div className="sidebar__header">
                <div className="sidebar__logo-container">
                    <Video size={16} />
                </div>
                <div className="sidebar__title-block">
                    <span className="sidebar__title">CamGuard</span>
                </div>
            </div>

            <nav className="sidebar__nav">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePage === item.id;
                    return (
                        <button
                            key={item.id}
                            className={`sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
                            onClick={() => setActivePage(item.id)}
                            role="tab"
                            aria-selected={isActive}
                            aria-label={item.label}
                        >
                            <span className="sidebar__item-left">
                                <Icon size={16} className="sidebar__icon" />
                                <span className="sidebar__label">{item.label}</span>
                            </span>
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}
