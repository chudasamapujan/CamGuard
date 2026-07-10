import React from 'react';

function Skeleton({ width, height, borderRadius = 8, style = {} }) {
    return (
        <div
            className="skeleton"
            style={{
                width: width || '100%',
                height: height || 16,
                borderRadius,
                ...style,
            }}
            aria-hidden="true"
        />
    );
}

export function SkeletonCard() {
    return (
        <div className="skeleton-card" aria-hidden="true">
            <div className="skeleton-card__header">
                <Skeleton width={120} height={18} />
                <Skeleton width={72} height={24} borderRadius={12} />
            </div>
            <Skeleton width={160} height={13} style={{ marginTop: 8 }} />
            <div className="skeleton-card__bars">
                <Skeleton height={8} style={{ marginTop: 20 }} />
                <Skeleton height={8} style={{ marginTop: 12 }} />
                <Skeleton height={8} style={{ marginTop: 12 }} />
            </div>
            <div className="skeleton-card__footer">
                <Skeleton width={80} height={13} />
                <Skeleton width={80} height={13} />
            </div>
        </div>
    );
}

export function SkeletonSummaryCard() {
    return (
        <div className="skeleton-summary" aria-hidden="true">
            <Skeleton width={40} height={40} borderRadius={10} />
            <div>
                <Skeleton width={48} height={28} style={{ marginBottom: 6 }} />
                <Skeleton width={80} height={12} />
            </div>
        </div>
    );
}

export default React.memo(Skeleton);
