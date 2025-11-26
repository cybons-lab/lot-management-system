import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.services.allocation import allocations_service
    print("Successfully imported allocations_service")
except ImportError as e:
    print(f"Failed to import allocations_service: {e}")
    sys.exit(1)

expected_attributes = [
    "FefoLotPlan",
    "FefoLinePlan",
    "FefoPreviewResult",
    "FefoCommitResult",
    "AllocationCommitError",
    "AllocationNotFoundError",
    "_load_order",
    "_existing_allocated_qty",
    "_resolve_next_div",
    "_lot_candidates",
    "validate_preview_eligibility",
    "load_order_for_preview",
    "calculate_line_allocations",
    "build_preview_result",
    "preview_fefo_allocation",
    "validate_commit_eligibility",
    "persist_allocation_entities",
    "update_order_line_status",
    "update_order_allocation_status",
    "commit_fefo_allocation",
    "cancel_allocation",
    "allocate_manually",
    "allocate_with_tracing",
]

missing = []
for attr in expected_attributes:
    if not hasattr(allocations_service, attr):
        missing.append(attr)

if missing:
    print(f"Missing attributes in allocations_service: {missing}")
    sys.exit(1)
else:
    print("All expected attributes are present.")
