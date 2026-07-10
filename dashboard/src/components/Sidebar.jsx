import React from 'react';
import { LayoutDashboard, Video, FolderCog, Bell, Sliders } from 'lucide-react';

export default function Sidebar({ activePage, setActivePage, activeAlertsCount }) {
    const navItems = [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'cameras', label: 'Camera Fleet', icon: Video },
        { id: 'management', label: 'Camera Management', icon: FolderCog },
        { id: 'alerts', label: 'Alert Log', icon: Bell, badge: activeAlertsCount },
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
                            {item.badge > 0 && (
                                <span className={`sidebar__badge ${item.id === 'alerts' ? 'sidebar__badge--alert' : ''}`}>
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}
