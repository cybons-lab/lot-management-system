import json
from fastapi.openapi.utils import get_openapi
from app.main import app

openapi_schema = get_openapi(
    title=app.title,
    version=app.version,
    openapi_version=app.openapi_version,
    description=app.description,
    routes=app.routes,
)

print(json.dumps(openapi_schema, indent=2))
