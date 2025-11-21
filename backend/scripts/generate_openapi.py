#!/usr/bin/env python3
"""Generate OpenAPI schema from FastAPI app."""

import json
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

try:
    from app.main import app

    openapi_schema = app.openapi()
    print(json.dumps(openapi_schema, indent=2))
except Exception as e:
    print(f"Error generating OpenAPI schema: {e}", file=sys.stderr)
    sys.exit(1)
