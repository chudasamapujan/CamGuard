import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Bell, Sliders, Video } from 'lucide-react';

export default function Sidebar({ activePage, setActivePage }) {
    const navItems = [
        { id: 'dashboard', path: '/', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'alerts', path: '/alerts', label: 'Alerts', icon: Bell },
        { id: 'settings', path: '/settings', label: 'Settings', icon: Sliders },
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
                    return (
                        <NavLink
                            key={item.id}
                            to={item.path}
                            end={item.path === '/'}
                            onClick={() => setActivePage && setActivePage(item.id)}
                            className={({ isActive }) => `sidebar__item ${isActive || activePage === item.id ? 'sidebar__item--active' : ''}`}
                            role="tab"
                            aria-label={item.label}
                        >
                            <span className="sidebar__item-left">
                                <Icon size={16} className="sidebar__icon" />
                                <span className="sidebar__label">{item.label}</span>
                            </span>
                        </NavLink>
                    );
                })}
            </nav>
        </aside>
    );
}
