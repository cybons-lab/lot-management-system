"""Allocations Service Package.

Modules:
- fefo: FEFO calculation logic
- search: Lot candidate search
- suggestion: Forecast-based suggestions
- utils: Shared utilities

Action modules (refactored from actions.py):
- commit: FEFO allocation commit operations
- manual: Manual allocation (Drag & Assign)
- cancel: Allocation cancellation
- confirm: Hard/Soft allocation confirmation
- auto: Auto-allocation with FEFO strategy

Note: actions.py is kept for backward compatibility and re-exports
all functions from the refactored modules.
"""
