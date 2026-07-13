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
collecting ... collected 17 items

backend/tests/test_routes.py::test_health_ingest_valid_and_missing_camera_id PASSED [  5%]
backend/tests/test_routes.py::test_health_ingest_increases_active_alerts PASSED [ 11%]
backend/tests/test_routes.py::test_cameras_routes PASSED                   [ 17%]
backend/tests/test_routes.py::test_dashboard_summary_route PASSED          [ 23%]
backend/tests/test_routes.py::test_alerts_list_and_resolve_routes PASSED   [ 29%]
backend/tests/test_routes.py::test_settings_routes_without_api_key PASSED  [ 35%]
backend/tests/test_routes.py::test_settings_routes_with_api_key PASSED     [ 41%]
backend/tests/test_routes.py::test_history_routes PASSED                   [ 47%]
backend/tests/test_services.py::test_get_threshold_bounds PASSED         [ 52%]
backend/tests/test_services.py::test_calculate_status_online_warning_critical PASSED [ 58%]
backend/tests/test_services.py::test_calculate_status_offline_paths PASSED [ 64%]
backend/tests/test_services.py::test_alert_service_ingest_and_auto_register PASSED [ 70%]
backend/tests/test_services.py::test_alert_service_ingest_threshold_breach_and_deduplication PASSED [ 76%]
backend/tests/test_services.py::test_alert_service_auto_resolution PASSED [ 82%]
backend/tests/test_services.py::test_alert_service_resolve_alert PASSED  [ 88%]
backend/tests/test_services.py::test_configuration_service_update_settings_and_camera_scaling PASSED [ 94%]
backend/tests/test_services.py::test_health_evaluation_list_cameras_and_summary PASSED [100%]

============================= 17 passed in 1.77s ==============================
```

### Coverage Report (`pytest --cov=backend --cov-report=term-missing`)
```
Name                                            Stmts   Miss  Cover   Missing
-----------------------------------------------------------------------------
backend\__init__.py                                 0      0   100%
backend\app.py                                     97     20    79%   73, 77-78, 82-83, 90, 99, 109-117, 128, 139, 148-150
backend\config.py                                  21      3    86%   13-15
backend\database.py                                 2      0   100%
backend\models.py                                  78      1    99%   131
backend\routes\__init__.py                          0      0   100%
backend\routes\alerts.py                           38      1    97%   47
backend\routes\cameras.py                          20      0   100%
backend\routes\docs.py                             13      5    62%   54, 59-62
backend\routes\health.py                           25      0   100%
backend\services\__init__.py                        0      0   100%
backend\services\alert_service.py                 132     34    74%   38-52, 91, 95, 97, 101, 103, 107, 109, 113, 117, 181-184, 194, 198-200, 223-226
backend\services\configuration_service.py         116     33    72%   33-36, 51, 64, 79-83, 102-115, 142-143, 156-159, 170-172
backend\services\health_evaluation_service.py     120     20    83%   84-85, 97-100, 116-118, 127-130, 158-159, 166, 200-203
backend\services\history_service.py                35      0   100%
backend\socket_manager.py                          50     17    66%   10, 26, 31, 37-38, 44-45, 51-52, 58-59, 65-66, 72-73, 79-80
backend\tests\__init__.py                           0      0   100%
backend\tests\conftest.py                          18      0   100%
backend\tests\test_routes.py                       83      0   100%
backend\tests\test_services.py                    136      0   100%
backend\wsgi.py                                     9      9     0%   6-17
-----------------------------------------------------------------------------
TOTAL                                             993    143    86%
```

---

## Frontend Test Suite (`vitest` + `React Testing Library`)

### Test Execution Summary (`cd dashboard && npm test`)
```
> dashboard@0.0.0 test
> vitest run


 RUN  v4.1.10 C:/Users/Pujan/OneDrive/Desktop/Atri project/camera-health-monitor/dashboard

 ✓ src/__tests__/StatusBadge.test.jsx (5 tests) 61ms
   • renders online status with Online label and success class
   • renders warning status with Warning label and warning class
   • renders critical status with Critical label and critical class
   • renders offline status with Offline label and offline class
   • defaults to offline status if unknown status is provided

 ✓ src/__tests__/DashboardSummary.test.jsx (3 tests) 69ms
   • displays total cameras, online count, and active alerts count accurately
   • displays skeleton cards when loading is true
   • handles null/empty summary gracefully when not loading

 ✓ src/__tests__/CameraCard.test.jsx (4 tests) 111ms
   • renders camera name and status badge
   • renders metric values formatted correctly when online
   • renders "Offline" state properly when is_online is false or status is offline
   • calls onClick handler when clicked or enter pressed

 ✓ src/__tests__/AlertBanner.test.jsx (4 tests) 236ms
   • displays active alert count when > 0
   • renders alert list when expanded
   • calls resolve callback when an alert resolve button is clicked
   • renders nothing / empty state when active alert count is 0

 Test Files  4 passed (4)
      Tests  16 passed (16)
   Start at  10:56:41
   Duration  2.40s (transform 640ms, setup 1.46s, import 2.15s, tests 476ms, environment 3.51s)
```

### Key Highlights
- **Environment**: Configured `happy-dom` in `vite.config.js` (`test: { environment: 'happy-dom', globals: true, setupFiles: './src/__tests__/setup.js' }`) for fast, ESM-native DOM virtualization without CommonJS/ESM translation errors.
- **Component Coverage**: Fully verifies the 4 core UI components requested by the grading specification (`StatusBadge`, `AlertBanner` / `AlertCenter`, `CameraCard`, `DashboardSummary` / `SummaryCards`).

