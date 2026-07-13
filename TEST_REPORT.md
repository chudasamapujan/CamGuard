# Test & Coverage Report

## Overview
This report summarizes the execution results and code coverage metrics for the CamGuard backend test suite (`pytest` with `pytest-cov`) and frontend test suite (`vitest`).

---

## Backend Test Suite (`pytest`)

### Test Execution Summary
```
============================= test session starts =============================
platform win32 -- Python 3.13.14, pytest-9.1.1, pluggy-1.6.0
cachedir: .pytest_cache
rootdir: C:\Users\Pujan\OneDrive\Desktop\Atri project\camera-health-monitor
configfile: pytest.ini
plugins: anyio-4.8.0, Flask-Dance-7.1.0, cov-7.1.0, flask-1.3.0
collecting ... collected 21 items

backend/tests/test_routes.py::test_health_ingest_valid_and_missing_camera_id PASSED [  4%]
backend/tests/test_routes.py::test_health_ingest_increases_active_alerts PASSED [  9%]
backend/tests/test_routes.py::test_cameras_routes PASSED                   [ 14%]
backend/tests/test_routes.py::test_dashboard_summary_route PASSED          [ 19%]
backend/tests/test_routes.py::test_alerts_list_and_resolve_routes PASSED   [ 23%]
backend/tests/test_routes.py::test_settings_routes_without_api_key PASSED  [ 28%]
backend/tests/test_routes.py::test_settings_routes_with_api_key PASSED     [ 33%]
backend/tests/test_routes.py::test_history_routes PASSED                   [ 38%]
backend/tests/test_routes.py::test_rate_limiting PASSED                    [ 42%]
backend/tests/test_services.py::test_get_threshold_bounds PASSED         [ 47%]
backend/tests/test_services.py::test_calculate_status_online_warning_critical PASSED [ 52%]
backend/tests/test_services.py::test_calculate_status_offline_paths PASSED [ 57%]
backend/tests/test_services.py::test_alert_service_ingest_and_auto_register PASSED [ 61%]
backend/tests/test_services.py::test_alert_service_ingest_threshold_breach_and_deduplication PASSED [ 66%]
backend/tests/test_services.py::test_alert_service_auto_resolution PASSED [ 71%]
backend/tests/test_services.py::test_alert_service_resolve_alert PASSED  [ 76%]
backend/tests/test_services.py::test_configuration_service_update_settings_and_camera_scaling PASSED [ 80%]
backend/tests/test_services.py::test_health_evaluation_list_cameras_and_summary PASSED [ 85%]
backend/tests/test_services.py::test_n_plus_one_bulk_evaluation_queries PASSED [ 90%]
backend/tests/test_services.py::test_camera_location_default_and_ingestion_update PASSED [ 95%]
backend/tests/test_services.py::test_rate_limiter_initialization PASSED    [100%]

============================= 21 passed in 1.73s ==============================
```

### Coverage Report (`pytest --cov=backend --cov-report=term-missing`)
```
Name                                            Stmts   Miss  Cover   Missing
-----------------------------------------------------------------------------
backend\__init__.py                                 0      0   100%
backend\app.py                                    116     19    84%   84, 92-93, 98, 111, 119, 129-137, 148, 159, 168-170
backend\config.py                                  22      3    86%   13-15
backend\database.py                                 4      0   100%
backend\limiter.py                                  3      0   100%
backend\models.py                                  87      1    99%   153
backend\routes\__init__.py                          0      0   100%
backend\routes\alerts.py                           21      0   100%
backend\routes\auth.py                             14      1    93%   13
backend\routes\cameras.py                          24      0   100%
backend\routes\docs.py                             13      5    62%   54, 59-62
backend\routes\health.py                           46      2    96%   31, 37
backend\routes\settings.py                         25      1    96%   29
backend\services\__init__.py                        0      0   100%
backend\services\alert_service.py                 139     38    73%   21, 39-55, 58-59, 102, 104, 108, 110, 114, 116, 120, 124, 191-194, 204, 208-210, 233-236
backend\services\configuration_service.py         116     33    72%   33-36, 51, 64, 79-83, 102-115, 142-143, 156-159, 170-172
backend\services\health_evaluation_service.py     135     20    85%   78, 116-117, 126-129, 145-147, 156-159, 222-223, 264-267
backend\services\history_service.py                35      0   100%
backend\socket_manager.py                          50     17    66%   10, 26, 31, 37-38, 44-45, 51-52, 58-59, 65-66, 72-73, 79-80
backend\tests\__init__.py                           0      0   100%
backend\tests\conftest.py                          18      0   100%
backend\tests\test_routes.py                      139      0   100%
backend\tests\test_services.py                    142      0   100%
backend\wsgi.py                                     9      9     0%   6-17
-----------------------------------------------------------------------------
TOTAL                                            1158    149    87%
```

---

## Frontend Test Suite (`vitest` + `React Testing Library`)

### Test Execution Summary (`cd dashboard && npm test -- --run`)
```
> dashboard@0.0.0 test
> vitest run


 RUN  v4.1.10 C:/Users/Pujan/OneDrive/Desktop/Atri project/camera-health-monitor/dashboard

 ✓ src/__tests__/StatusBadge.test.jsx (5 tests) 144ms
   • renders online status with Online label and success class
   • renders warning status with Warning label and warning class
   • renders critical status with Critical label and critical class
   • renders offline status with Offline label and offline class
   • defaults to offline status if unknown status is provided

 ✓ src/__tests__/DashboardSummary.test.jsx (3 tests) 183ms
   • displays total cameras, online count, and active alerts count accurately
   • displays skeleton cards when loading is true
   • handles null/empty summary gracefully when not loading

 ✓ src/__tests__/CameraCard.test.jsx (4 tests) 288ms
   • renders camera name and status badge
   • renders metric values formatted correctly when online
   • renders "Offline" state properly when is_online is false or status is offline
   • calls onClick handler when clicked or enter pressed

 ✓ src/__tests__/MetricChart.test.jsx (5 tests) 345ms
   • renders loading state initially
   • renders error message if history fetch fails
   • renders chart and health score when data is successfully fetched
   • changes time window when a different window button is clicked
   • updates chart data in real time when socket history_update event arrives

 ✓ src/__tests__/AlertBanner.test.jsx (4 tests) 377ms
   • displays active alert count when > 0
   • renders alert list when expanded
   • calls resolve callback when an alert resolve button is clicked
   • renders nothing / empty state when active alert count is 0

 ✓ src/__tests__/AppRouting.test.jsx (4 tests) 363ms
   • navigates to Settings page when Settings tab is clicked
   • navigates back to Dashboard when Dashboard tab is clicked
   • updates live connection status indicator when socket connects and disconnects
   • receives real-time camera_update and updates status counts and cards without page reload

 Test Files  6 passed (6)
      Tests  25 passed (25)
   Start at  12:39:07
   Duration  6.38s (transform 3.12s, setup 5.97s, import 8.71s, tests 1.70s, environment 14.28s)
```

### Key Highlights
- **Environment**: Configured `happy-dom` in `vite.config.js` (`test: { environment: 'happy-dom', globals: true, setupFiles: './src/__tests__/setup.js' }`) for fast, ESM-native DOM virtualization without CommonJS/ESM translation errors.
- **Component & Routing Coverage**: Fully verifies the 6 core areas of the dashboard (`StatusBadge`, `DashboardSummary`, `CameraCard`, `MetricChart`, `AlertBanner`, and `AppRouting` real-time WebSocket state management).
