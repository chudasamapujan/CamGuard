import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import CameraCard from './CameraCard';
import { SkeletonCard } from './Skeleton';
import EmptyState from './EmptyState';

function CameraGrid({ cameras, loading, settings, onCameraClick, onToggle, onEdit, onAddCamera }) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    const filtered = useMemo(() => {
        if (!cameras) return [];
        return cameras.filter(c => {
            const matchesSearch = search === '' ||
                c.name?.toLowerCase().includes(search.toLowerCase()) ||
                c.id?.toLowerCase().includes(search.toLowerCase()) ||
                c.location?.toLowerCase().includes(search.toLowerCase());

            if (statusFilter === 'all') {
                return matchesSearch;
            }
            if (statusFilter === 'disabled') {
                return matchesSearch && !c.is_enabled;
            }
            // For other statuses, must be enabled and match status
            return matchesSearch && c.is_enabled && c.status === statusFilter;
        });
    }, [cameras, search, statusFilter]);

    const statusCounts = useMemo(() => {
        if (!cameras) return {};
        const counts = { all: cameras.length, online: 0, warning: 0, critical: 0, offline: 0, disabled: 0 };
        cameras.forEach(c => {
            if (!c.is_enabled) {
                counts.disabled++;
            } else if (counts[c.status] !== undefined) {
                counts[c.status]++;
            }
        });
        return counts;
    }, [cameras]);

    if (loading) {
        return (
            <section className="camera-section">
                <div className="camera-grid">
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            </section>
        );
    }

    const filters = [
        { key: 'all', label: 'All' },
        { key: 'online', label: 'Healthy' },
        { key: 'warning', label: 'Warning' },
        { key: 'critical', label: 'Critical' },
        { key: 'offline', label: 'Offline' },
        { key: 'disabled', label: 'Disabled' }
    ];

    return (
        <section className="camera-section" aria-label="Camera fleet">
            {/* Toolbar */}
            <div className="camera-toolbar">
                <div className="camera-toolbar__search">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search fleet by Camera Name, ID, or Location..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        aria-label="Search cameras by name, ID, or location"
                        id="camera-search"
                    />
                    {search && (
                        <button className="camera-toolbar__clear" onClick={() => setSearch('')} aria-label="Clear search">
                            <X size={14} />
                        </button>
                    )}
                </div>

                <button
                    className={`btn btn--secondary ${showFilters ? 'btn--active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                    aria-expanded={showFilters}
                    aria-controls="camera-filters"
                >
                    <SlidersHorizontal size={15} />
                    <span>Filters ({statusFilter.toUpperCase()})</span>
                </button>
            </div>

            {/* Filter bar */}
            {showFilters && (
                <div className="camera-filters" id="camera-filters" role="group" aria-label="Status filters">
                    {filters.map(f => (
                        <button
                            key={f.key}
                            className={`filter-chip ${statusFilter === f.key ? 'filter-chip--active' : ''} ${f.key !== 'all' ? `filter-chip--${f.key}` : ''}`}
                            onClick={() => setStatusFilter(f.key)}
                            aria-pressed={statusFilter === f.key}
                        >
                            {f.label}
                            <span className="filter-chip__count">{statusCounts[f.key] ?? 0}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Grid */}
            {filtered.length === 0 ? (
                cameras && cameras.length === 0 ? (
                    <EmptyState
                        type="setup"
                        onAction={onAddCamera}
                        actionLabel="Register Your First Camera"
                    />
                ) : (
                    <EmptyState
                        type="cameras"
                        title="No cameras match your filters"
                        description="Try adjusting your search or filters."
                    />
                )
            ) : (
                <div className="camera-grid">
                    {filtered.map(cam => (
                        <CameraCard
                            key={cam.id}
                            camera={cam}
                            settings={settings}
                            onClick={onCameraClick}
                            onToggle={onToggle}
                            onEdit={onEdit}
                        />
                    ))}
                </div>
            )}

            <p className="camera-section__count">
                Showing {filtered.length} of {cameras?.length ?? 0} cameras in fleet
            </p>
        </section>
    );
}

export default React.memo(CameraGrid);
