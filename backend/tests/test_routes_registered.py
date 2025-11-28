"""
Tests to ensure core routes are registered and the application can start.
This prevents import errors from causing startup failures.
"""

from app.main import app


def _has(method: str, path: str) -> bool:
    for r in app.routes:
        if getattr(r, "path", None) == path and method in getattr(r, "methods", set()):
            return True
    return False


def test_app_import_succeeds():
    """Test that the main application can be imported without errors."""
    assert app is not None
    assert hasattr(app, "routes")


def test_core_routes_exist():
    """Test that essential routes are registered."""
    assert _has("GET", "/api/health")
    # 必要なら増やす: assert _has("GET", "/api/docs")


def test_masters_routes_loaded():
    """Test that masters endpoints are available after restoration."""
    # Check that at least some masters endpoints are loaded
    # This validates the dynamic import mechanism
    masters_paths = [
        path for r in app.routes if (path := getattr(r, "path", "")).startswith("/api/products")
    ]
    assert len(masters_paths) > 0, "No masters routes were loaded"
