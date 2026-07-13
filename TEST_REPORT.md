# Test & Coverage Report

## Overview
This report summarizes the execution results and code coverage metrics for the CamGuard backend test suite (`pytest` with `pytest-cov`) and frontend test suite (`vitest` with `happy-dom` and `React Testing Library`).

---

## Backend Test Suite (`pytest`)

### Test Execution Summary
```
============================= test session starts =============================
platform win32 -- Python 3.13.14, pytest-9.1.1, pluggy-1.6.0
cachedir: .pytest_cache
rootdir: C:\Users\Pujan\OneDrive\Desktop\Atri project\camera-health-monitor
configfile: pytest.ini
testpaths: backend/tests
plugins: cov-7.1.0, flask-1.3.0
collecting ... collected 22 items

backend/tests/test_routes.py::test_health_ingest_valid_and_missing_camera_id PASSED [  4%]
backend/tests/test_routes.py::test_health_ingest_input_validation_rules PASSED [  9%]
backend/tests/test_routes.py::test_health_ingest_increases_active_alerts PASSED [ 13%]
backend/tests/test_routes.py::test_cameras_routes PASSED                 [ 18%]
backend/tests/test_routes.py::test_dashboard_summary_route PASSED        [ 22%]
backend/tests/test_routes.py::test_alerts_list_and_resolve_routes PASSED [ 27%]
backend/tests/test_routes.py::test_settings_routes_without_api_key PASSED [ 31%]
backend/tests/test_routes.py::test_settings_routes_with_api_key PASSED   [ 36%]
backend/tests/test_routes.py::test_history_routes PASSED                 [ 40%]
backend/tests/test_routes.py::test_exception_handler_production_vs_development PASSED [ 45%]
backend/tests/test_routes.py::test_auth_verify_route PASSED              [ 50%]
backend/tests/test_routes.py::test_rate_limiting PASSED                  [ 54%]
backend/tests/test_routes.py::test_create_app_production_api_key_check PASSED [ 59%]
backend/tests/test_services.py::test_get_threshold_bounds PASSED         [ 63%]
backend/tests/test_services.py::test_calculate_status_online_warning_critical PASSED [ 68%]
backend/tests/test_services.py::test_calculate_status_offline_paths PASSED [ 72%]
backend/tests/test_services.py::test_alert_service_ingest_and_auto_register PASSED [ 77%]
backend/tests/test_services.py::test_alert_service_ingest_threshold_breach_and_deduplication PASSED [ 81%]
backend/tests/test_services.py::test_alert_service_auto_resolution PASSED [ 86%]
backend/tests/test_services.py::test_alert_service_resolve_alert PASSED  [ 90%]
backend/tests/test_services.py::test_configuration_service_update_settings_and_camera_scaling PASSED [ 95%]
backend/tests/test_services.py::test_health_evaluation_list_cameras_and_summary PASSED [100%]

======================= 22 passed, 18 warnings in 1.67s =======================
```

### Coverage Report (`pytest --cov=backend --cov-report=term-missing`)
```
Name                                            Stmts   Miss  Cover   Missing
-----------------------------------------------------------------------------
backend\__init__.py                                 0      0   100%
backend\app.py                                    119     18    85%   94, 102-103, 108, 123, 133-141, 152, 163, 172-174
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
backend\services\alert_service.py                 140     38    73%   21, 39-55, 58-59, 102, 104, 108, 110, 114, 116, 120, 124, 192-195, 205, 209-211, 234-237
backend\services\configuration_service.py         116     33    72%   33-36, 51, 64, 79-83, 102-115, 142-143, 156-159, 170-172
backend\services\health_evaluation_service.py     137     20    85%   78, 116-117, 127-130, 146-148, 158-161, 224-225, 266-269
backend\services\history_service.py                35      0   100%
backend\socket_manager.py                          50     17    66%   10, 26, 31, 37-38, 44-45, 51-52, 58-59, 65-66, 72-73, 79-80
backend\tests\__init__.py                           0      0   100%
backend\tests\conftest.py                          18      0   100%
backend\tests\test_routes.py                      153      0   100%
backend\tests\test_services.py                    142      0   100%
backend\wsgi.py                                     9      9     0%   6-17
-----------------------------------------------------------------------------
TOTAL                                            1178    148    87%
```

---

## Frontend Test Suite (`vitest` + `React Testing Library`)

### Test Execution Summary (`cd dashboard && npm test -- --run`)
```
> dashboard@0.0.0 test
> vitest run


 RUN  v4.1.10 C:/Users/Pujan/OneDrive/Desktop/Atri project/camera-health-monitor/dashboard

 ✓ src/__tests__/StatusBadge.test.jsx (5 tests) 132ms
 ✓ src/__tests__/DashboardSummary.test.jsx (3 tests) 285ms
 ✓ src/__tests__/CameraCard.test.jsx (4 tests) 450ms
 ✓ src/__tests__/MetricChart.test.jsx (5 tests) 621ms
 ✓ src/__tests__/AlertBanner.test.jsx (4 tests) 667ms
 ✓ src/__tests__/AppRouting.test.jsx (4 tests) 538ms

 Test Files  6 passed (6)
      Tests  25 passed (25)
   Start at  16:07:00
   Duration  6.62s
```

### Key Highlights
*   **Environment:** Powered by `vitest` using a virtual DOM environment (`happy-dom`) for blazing fast native ESM executions.
*   **Coverage Areas:** Tests cover core component renderers (`StatusBadge`, `DashboardSummary`, `CameraCard`, `MetricChart`, `AlertBanner`) and layout client routing (`AppRouting`).
