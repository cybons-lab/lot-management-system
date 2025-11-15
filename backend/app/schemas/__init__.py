"""
Unified re-export of Pydantic schema classes used by the backend API.

Organized into feature-based subpackages:
- common/ - Base schemas and common utilities (2 files)
- masters/ - Master data schemas (4 files)
- orders/ - Order schemas (1 file)
- allocations/ - Allocation schemas (2 files)
- inventory/ - Inventory schemas (2 files)
- forecasts/ - Forecast schemas (1 file)
- integration/ - Integration schemas (1 file)
- admin/ - Admin schemas (3 files)
- system/ - System schemas (6 files)
"""

from __future__ import annotations

# Re-export all schemas from subpackages
from app.schemas.admin import *  # noqa: F403
from app.schemas.allocations import *  # noqa: F403
from app.schemas.common import *  # noqa: F403
from app.schemas.forecasts import *  # noqa: F403
from app.schemas.integration import *  # noqa: F403
from app.schemas.inventory import *  # noqa: F403
from app.schemas.masters import *  # noqa: F403
from app.schemas.orders import *  # noqa: F403
from app.schemas.system import *  # noqa: F403
