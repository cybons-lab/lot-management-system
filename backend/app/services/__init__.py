# backend/app/services/__init__.py
"""
Services Package - Business Logic Layer.

Refactored: Organized into feature-based subpackages.

Subpackages:
- allocation/ - Allocation services (4 files)
- seed/ - Seed data services (2 files)
- integration/ - Integration services (1 file)
- forecasts/ - Forecast services (2 files)
- inventory/ - Inventory services (4 files)
- masters/ - Master data services (2 files)
- orders/ - Order services (1 file)
- auth/ - Authentication services (2 files)
- admin/ - Admin services (3 files)
- common/ - Common utilities (4 files)
"""

# Re-export all from subpackages
from app.services.admin import *  # noqa: F403
from app.services.allocation import *  # noqa: F403
from app.services.auth import *  # noqa: F403
from app.services.common import *  # noqa: F403
from app.services.forecasts import *  # noqa: F403
from app.services.integration import *  # noqa: F403
from app.services.inventory import *  # noqa: F403
from app.services.masters import *  # noqa: F403
from app.services.orders import *  # noqa: F403
from app.services.seed import *  # noqa: F403
