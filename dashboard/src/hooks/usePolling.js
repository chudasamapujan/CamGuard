/**
 * usePolling Hook
 * ---------------
 * Custom React hook for polling data at a configurable interval.
 * Returns { data, loading, error, refresh }.
 * 
 * Design: Uses setInterval with cleanup on unmount.
 * Immediate fetch on mount + interval-based refresh.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export function usePolling(fetchFn, intervalMs = 5000) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const fetchRef = useRef(fetchFn);

    useEffect(() => {
        fetchRef.current = fetchFn;
    }, [fetchFn]);

    const refresh = useCallback(async () => {
        try {
            const response = await fetchRef.current();
            setData(response.data);
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, intervalMs);
        return () => clearInterval(interval);
    }, [refresh, intervalMs]);

    return { data, loading, error, refresh };
}
