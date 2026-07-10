/**
 * API Service
 * -----------
 * Centralized Axios client for all backend communication.
 * Base URL points to Flask API on port 5000.
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5000';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Camera endpoints
export const fetchCameras = () => api.get('/api/cameras');
export const fetchCamera = (id) => api.get(`/api/cameras/${id}`);
export const fetchCameraHistory = (id, hours = 24) =>
    api.get(`/api/cameras/${id}/history?hours=${hours}`);

// Dashboard
export const fetchDashboardSummary = () => api.get('/api/dashboard/summary');

// Alerts
export const fetchAlerts = (activeOnly = false, limit = 50) =>
    api.get(`/api/alerts?active=${activeOnly}&limit=${limit}`);
export const fetchAlertsSummary = () => api.get('/api/alerts/summary');
export const resolveAlert = (id) => api.put(`/api/alerts/${id}/resolve`);

// Config
export const fetchThresholds = () => api.get('/api/config/thresholds');
export const updateThresholds = (thresholds) =>
    api.put('/api/config/thresholds', thresholds);

export default api;
